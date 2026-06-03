export type User = {
    id: string;
    username: string;
    password: string;
    full_name: string;
    tier: 'general' | 'user' | 'admin';
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type UserCreatePayload = {
    username: string;
    password: string;
    full_name: string;
    tier: 'general' | 'user' | 'admin';
    is_active?: boolean;
};

export type UserUpdatePayload = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & {
    password?: string;
};

export type LoginRequest = {
    username: string;
    password: string;
};
