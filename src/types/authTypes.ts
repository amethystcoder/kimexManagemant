export type user = {
    id: string;
    username: string;
    password: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type loginRequest = {
    username: string;
    password: string;
}


export type userType = 'user' | 'admin' | 'semiadmin';