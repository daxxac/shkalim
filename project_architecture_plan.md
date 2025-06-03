# Сводный План Проектирования

Этот план объединяет все наши предыдущие обсуждения и решения по трем основным задачам.

## I. Локальное Шифрование Данных (Пункт 1)

*   **Цель:** Обеспечить шифрование всех финансовых данных пользователя (транзакции, категории, предстоящие платежи) локально с использованием мастер-пароля.
*   **Ключевые моменты реализации:**
    1.  **Хранилище (`financeStore`):**
        *   В `localStorage` (через `zustand/persist`) сохраняются:
            *   `masterPasswordHash`: Хэш мастер-пароля (для проверки).
            *   `encryptedDataBlob`: Единый JSON-блок, содержащий все чувствительные данные, зашифрованные с помощью `AES-GCM` (ключ из мастер-пароля через `PBKDF2`).
            *   Нечувствительные данные (например, `currentLanguage`).
        *   В оперативной памяти (не персистентно):
            *   `_currentPasswordInMemory`: Мастер-пароль в открытом виде, только пока приложение разблокировано (для перешифрования при изменениях).
            *   Расшифрованные `transactions`, `categories`, `upcomingCharges`.
    2.  **Процессы:**
        *   **Установка пароля (`setMasterPassword`):** Хэширование пароля, шифрование текущих (вероятно, дефолтных) данных, сохранение хэша и зашифрованного блока.
        *   **Разблокировка (`unlock`):** Проверка пароля по хэшу, расшифровка `encryptedDataBlob`, загрузка данных в состояние.
        *   **Блокировка (`lock`):** Очистка `_currentPasswordInMemory` и расшифрованных данных из оперативной памяти.
        *   **Изменение данных:** Любое изменение чувствительных данных в разблокированном состоянии триггерит их перешифрование с `_currentPasswordInMemory` и обновление `encryptedDataBlob`.
    3.  **Утилиты:** Используются существующие функции из `src/utils/encryption.ts` (`encryptData`, `decryptData`) и хелперы для хэширования пароля в `src/store/financeStore.ts`.
    4.  **UI:** Компонент `src/components/SecurityModal.tsx` для ввода пароля.

## II. Обмен Данными по Ссылке через Supabase (Пункт 2)

*   **Цель:** Позволить пользователю поделиться своей "базой данных" с другим пользователем через уникальную ссылку и временный пароль.
*   **Ключевые моменты реализации:**
    1.  **Supabase Setup:**
        *   **Таблица `shared_data_links`:**
            *   Колонки: `id (uuid, PK)`, `encrypted_blob (text)`, `created_at (timestamptz)`, `expires_at (timestamptz)`, `creator_user_id (uuid, nullable, FK to auth.users)`, `access_limit (int, nullable)`, `access_count (int, default 0)`.
            *   RLS политики для безопасного доступа.
        *   **Supabase Functions:**
            *   `create-share-link`: Принимает данные, зашифрованные временным паролем, создает запись в `shared_data_links`, возвращает `id` ссылки.
            *   `get-shared-data`: Принимает `share_id`, проверяет срок действия/лимиты, возвращает `encrypted_blob`.
            *   `cleanup-expired-shared-links` (Scheduled): Удаляет просроченные ссылки.
    2.  **Процесс Отправителя:**
        *   Вводит временный пароль.
        *   Текущие данные расшифровываются мастер-паролем (если нужно), затем шифруются временным паролем.
        *   Зашифрованный блок отправляется в `create-share-link`.
        *   Получает ссылку (вида `app.com/share/{share_id}`) и передает ее + временный пароль получателю.
    3.  **Процесс Получателя:**
        *   Открывает ссылку, вводит временный пароль.
        *   Приложение вызывает `get-shared-data`, расшифровывает данные.
        *   Предлагает импортировать (перезаписать или, в будущем, объединить).
        *   Импортированные данные немедленно перешифровываются мастер-паролем получателя (если он установлен).
    4.  **Обновление типов:** После создания таблицы в Supabase, обновить `src/integrations/supabase/types.ts`.

    ```mermaid
    sequenceDiagram
        participant UserA as Пользователь А
        participant ClientAppA as Клиент А
        participant SupabaseFuncCreate as SF create-share-link
        participant SupabaseDB as Supabase DB
        participant UserB as Пользователь Б
        participant ClientAppB as Клиент Б
        participant SupabaseFuncGet as SF get-shared-data

        UserA->>ClientAppA: "Поделиться", вводит временный пароль (tempPass)
        ClientAppA->>ClientAppA: Шифрует данные с tempPass -> encryptedBlob
        ClientAppA->>SupabaseFuncCreate: create(encryptedBlob)
        SupabaseFuncCreate->>SupabaseDB: INSERT (encryptedBlob) -> share_id
        SupabaseDB-->>SupabaseFuncCreate: share_id
        SupabaseFuncCreate-->>ClientAppA: share_id
        ClientAppA->>UserA: Ссылка (app.com/share/{share_id})
        UserA-->>UserB: Передает ссылку и tempPass

        UserB->>ClientAppB: Открывает ссылку, вводит tempPass
        ClientAppB->>SupabaseFuncGet: get(share_id)
        SupabaseFuncGet->>SupabaseDB: SELECT encryptedBlob WHERE id=share_id
        SupabaseDB-->>SupabaseFuncGet: encryptedBlob
        SupabaseFuncGet-->>ClientAppB: encryptedBlob
        ClientAppB->>ClientAppB: Расшифровывает данные с tempPass
        ClientAppB->>UserB: Предпросмотр, импорт данных
    ```

## III. Интеграция с Банками через Puppeteer и Supabase (Пункт 3)

*   **Цель:** Автоматически загружать транзакции из банков пользователя, используя Puppeteer на бэкенде, с безопасной обработкой учетных данных.
*   **Ключевые моменты реализации:**
    1.  **Supabase Setup:**
        *   **Таблица `bank_sync_jobs`:**
            *   Колонки: `id (uuid, PK)`, `user_id (uuid, FK to auth.users)`, `bank_identifier (text)`, `status (enum: pending, processing, completed, failed, requires_mfa)`, `payload (jsonb, для временных данных, например, зашифрованных учетных данных или MFA)`, `result_data (jsonb, для полученных транзакций)`, `error_message (text)`, `mfa_challenge (jsonb)`, `created_at`, `updated_at`.
            *   RLS политики.
        *   **Supabase Functions (для Puppeteer):**
            *   `initiate-bank-sync`: Создает задачу в `bank_sync_jobs`.
            *   `process-bank-sync-job-worker`: Основной обработчик. Берет задачи из очереди, запускает Puppeteer, взаимодействует с банком, обновляет статус задачи. Потребует установки Puppeteer и браузера в окружении выполнения функции.
            *   `get-bank-sync-job-status`: Позволяет клиенту опрашивать статус задачи.
            *   `submit-mfa-code`: Позволяет клиенту отправить MFA-код для продолжения задачи.
            *   `cleanup-completed-bank-sync-jobs` (Scheduled): Очищает старые задачи.
    2.  **Безопасность Учетных Данных:**
        *   Учетные данные банка **никогда не хранятся постоянно**.
        *   Передаются на `initiate-bank-sync` по HTTPS. Рассматривается вариант их шифрования асимметричным ключом (публичный ключ у клиента, приватный – в секретах функции-воркера) для безопасной передачи в `payload` задачи. Используются только на время сеанса Puppeteer.
    3.  **Puppeteer Скрипты:**
        *   Адаптация существующих парсеров (`src/utils/calBankParser.ts` и др.) для работы с Puppeteer (логин, навигация, извлечение данных, обработка ошибок и MFA).
    4.  **Обработка MFA:** Воркер распознает запрос MFA, обновляет статус задачи. Клиент предоставляет код, воркер продолжает.
    5.  **Клиентская Логика:**
        *   `src/services/bankSyncService.ts` будет переписан для вызова Supabase Functions (`initiate-bank-sync`, `get-bank-sync-job-status`, `submit-mfa-code`) вместо `localhost:3001`.
        *   UI (`src/components/BankConnectionForm.tsx`, `src/components/AutoSyncPanel.tsx`) для управления процессом.

    ```mermaid
    sequenceDiagram
        participant User
        participant ClientApp as Клиентское приложение
        participant BankSyncService
        participant SupabaseFuncInit as SF initiate-bank-sync
        participant SupabaseDBJobs as Supabase DB (bank_sync_jobs)
        participant SupabaseFuncWorker as SF process-bank-sync-job-worker
        participant Puppeteer
        participant ExternalBank as Внешний Банк

        User->>ClientApp: Вводит учетные данные банка
        ClientApp->>BankSyncService: initiateSync(bank, credentials)
        BankSyncService->>SupabaseFuncInit: initiate_bank_sync(bank, creds_encrypted_with_worker_pub_key?)
        SupabaseFuncInit->>SupabaseDBJobs: INSERT INTO bank_sync_jobs (status='pending', payload=...) -> job_id
        SupabaseFuncInit-->>BankSyncService: job_id
        BankSyncService-->>ClientApp: Уведомление о начале (job_id)

        loop Опрос статуса / Realtime Updates
            ClientApp->>BankSyncService: getSyncStatus(job_id)
            BankSyncService->>SupabaseFuncWorker: (косвенно) get_job_status(job_id)
            SupabaseFuncWorker-->>BankSyncService: { status, data?, error?, mfa_challenge? }
            BankSyncService-->>ClientApp: Обновление UI
        end

        Note over SupabaseFuncWorker, Puppeteer: Воркер берет задачу из bank_sync_jobs
        SupabaseFuncWorker->>SupabaseDBJobs: UPDATE status='processing'
        SupabaseFuncWorker->>Puppeteer: Запуск скрипта (расшифровывает учетные данные из payload своим приватным ключом)
        Puppeteer->>ExternalBank: Логин, сбор данных
        alt MFA Required
            ExternalBank-->>Puppeteer: MFA Challenge
            Puppeteer-->>SupabaseFuncWorker: MFA Info
            SupabaseFuncWorker->>SupabaseDBJobs: UPDATE status='requires_mfa', mfa_challenge=...
            ClientApp->>User: Запрос MFA кода
            User->>ClientApp: Ввод MFA кода
            ClientApp->>BankSyncService: submitMfaCode(job_id, mfa_code)
            BankSyncService->>SupabaseFuncWorker: (косвенно) передает MFA код
            SupabaseFuncWorker->>Puppeteer: Продолжить с MFA
            Puppeteer->>ExternalBank: Отправка MFA
        end
        ExternalBank-->>Puppeteer: Данные транзакций
        Puppeteer-->>SupabaseFuncWorker: Собранные транзакции
        SupabaseFuncWorker->>SupabaseDBJobs: UPDATE status='completed', result_data=transactions