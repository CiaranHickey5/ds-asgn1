# Assignment One - Distributed Systems

## Student Information

| Field          | Value         |
| -------------- | ------------- |
| Name           | Ciaran Hickey |
| Student Number | 20088959      |

## Video Demonstration of App

https://youtu.be/8Jk5TyF2GZo

## Overview

This app uses two APIs built using AWS CDK that supports managing books and reviews with authentication and authorization. The app includes an **Auth API** for user authentication and an **App API** for managing books and reviews.

### Key Features

- **GET, POST and PUT Requests**: A selection of requests available for users.
- **User Authentication**: Users can sign up, sign in, and log out, post and put requests require users to be signed in.

### Services Used:

- **AWS Lambda**: Functions that handle the logic for the endpoints.
- **Amazon DynamoDB**: Stores book and review data.
- **Amazon Cognito**: Manages user authentication.
- **Amazon API Gateway**: Two RESTful APIs used.

## API Endpoints

### **Auth API Endpoints**

#### **POST /auth/signup**

- Starts the registeration for a user, sending their email a verification code.
- **Request Body**:

  ```json
  {
    "username": "user@example.com",
    "password": "Password123",
    "email": "user@example.com"
  }
  ```

  #### **POST /auth/completeSignup**

- Completes the regisration of a new user, enabling them to signin.
- **Request Body**:

  ```json
  {
    "email": "user@example.com",
    "code": "123456"
  }
  ```

  #### **POST /auth/signin**

- Signs a user in, giving them their bearer tokens to access their privileges.
- **Request Body**:

  ```json
  {
    "username": "user@example.com",
    "password": "Password123"
  }
  ```

  #### **POST /auth/signout**

- Logs the user out, invalidating their tokens.
- **Request Body**:
  ```json
  {
    "accessToken": "JWT_ACCESS_TOKEN",
    "idToken": "JWT_ID_TOKEN"
  }
  ```

### **Public App API Endpoints**

#### **GET /books**

- Retrieves a list of all books.
- Query Parameters: None
- **Response**:

```json
  {
    "bookId": 1,
    "title": "Book Title",
    "author": "Author Name"
  },
  {
    "bookId": 2,
    "title": "Another Book Title",
    "author": "Another Author"
  }
```

#### **GET /books/{bookId}**

- Retrieves a specific book by bookId.
- Query Parameters: bookId
- **Response**:

```json
{
  "bookId": 1,
  "title": "Book Title",
  "author": "Author Name"
}
```

#### **GET /books/{bookId}**

- Extension of bookId endpoints that displays reviews of specified book.
- Query Parameters: bookId?reviews=true
- **Response**:

```json
{
  "bookId": 1,
  "title": "Book Title",
  "author": "Author Name"
}
"reviews": [
        {
            "bookId": 1,
            "reviewerName": "Bob",
            "reviewText": "Great story, but a bit predictable."
        }
    ]
```

### **Authenticated App API Endpoints**

#### **POST /books**

- Adds a book to the collection.
- **Request Body**:

  ```json
  {
    "title": "New Book Title",
    "author": "Author Name"
  }
  ```

  #### **PUT /books/{bookId}**

- Updates an existing book.
- **Request Body**:

  ```json
  {
    "title": "New Book Title",
    "author": "Author Name"
  }
  ```

  #### **POST /books/{bookId}/reviews**

- Adds a review for a specific book.
- **Request Body**:
  ```json
  {
    "review": "Great book, would recommend!"
  }
  ```
