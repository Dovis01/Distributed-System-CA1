export type MovieReview = {
    MovieId: number;
    ReviewerName: string;
    ReviewDate: string;
    Content: string;
    Rating: number;
}

export type UpdateReviewText = {
    Content: string;
}

export type SignUpBody = {
    username: string;
    password: string;
    email: string;
}

export type ConfirmSignUpBody = {
    username: string;
    code: string;
}

export type SignInBody = {
    username: string;
    password: string;
}
