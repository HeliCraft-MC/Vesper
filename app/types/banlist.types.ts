/* ────────────────────────────────────────────────────────────── */
/*  Типы для системы банов                                        */
/* ────────────────────────────────────────────────────────────── */

export interface IBan {
    /** Уникальный ID бана в БД */
    id: number;

    /** UUID забанного игрока (без дефисов) */
    uuid: string;

    /** IP адрес (может быть null) */
    ip: string | null;

    /** Причина бана */
    reason: string;

    /** UUID администратора, выдавшего бан */
    banned_by_uuid: string;

    /** Никнейм администратора, выдавшего бан */
    banned_by_name: string;

    /** UUID администратора, снявшего бан (null если активен) */
    removed_by_uuid: string | null;

    /** Никнейм, снявший бан (null если активен) */
    removed_by_name: string | null;

    /** Причина снятия (null если активен) */
    removed_by_reason: string | null;

    /** Дата/время снятия (null если активен) */
    removed_by_date: string | null;

    /** Время создания бана (timestamp в ms) */
    time: number;

    /** Время окончания бана (timestamp в ms); -1 = вечный */
    until: number;

    /** ID шаблона (255 = без шаблона) */
    template: number;

    /** Область применения бана (всегда "*") */
    server_scope: string;

    /** Сервер-источник бана (null) */
    server_origin: string | null;

    /** 1 = скрытый бан, 0 = обычный */
    silent: number;

    /** 1 = IP бан, 0 = обычный */
    ipban: number;

    /** 1 = wildcard IP бан, 0 = нет */
    ipban_wildcard: number;

    /** 1 = активный бан, 0 = снят */
    active: number;
}

export interface IBanListResponse {
    /** Массив банов */
    items: IBan[];

    /** Общее количество записей для пагинации */
    total: number;
}

