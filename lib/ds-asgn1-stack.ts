import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { books, reviews } from "../seed/books";
import { generateBatch } from "../shared/util";

export class DsAsgn1Stack extends cdk.Stack {
  private authApi: apig.RestApi;
  private userPoolId: string;
  private userPoolClientId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito Setup
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
      },
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;

    // Authentication API Gateway
    this.authApi = new apig.RestApi(this, "AuthAPI", {
      description: "Authentication API",
      deployOptions: { stageName: "auth" },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization"],
        allowMethods: ["OPTIONS", "POST"],
        allowOrigins: ["*"],
      },
    });

    // Authentication Endpoints
    this.addAuthRoute("signup", "POST", "SignupFn", "signup.ts");
    this.addAuthRoute(
      "completeSignup",
      "POST",
      "CompleteSignupFn",
      "completeSignup.ts"
    );
    this.addAuthRoute("signin", "POST", "SigninFn", "signin.ts");
    this.addAuthRoute("signout", "POST", "SignoutFn", "signout.ts");

    // DynamoDB Tables
    const booksTable = new dynamodb.Table(this, "BooksTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Books",
    });

    const reviewsTable = new dynamodb.Table(this, "ReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Reviews",
    });

    // Lambda Functions
    const getBookByIdFn = new lambdanode.NodejsFunction(this, "GetBookByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getBookById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: cdk.Aws.REGION,
      },
    });

    const getAllBooksFn = new lambdanode.NodejsFunction(this, "GetAllBooksFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllBooks.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: cdk.Aws.REGION,
      },
    });

    const newBookFn = new lambdanode.NodejsFunction(this, "AddBookFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addBook.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: cdk.Aws.REGION,
      },
    });

    const newReviewFn = new lambdanode.NodejsFunction(this, "AddReviewFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: cdk.Aws.REGION,
      },
    });

    const updateReviewFn = new lambdanode.NodejsFunction(
      this,
      "UpdateReviewFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/updateReview.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          REVIEWS_TABLE_NAME: reviewsTable.tableName,
          REGION: cdk.Aws.REGION,
        },
      }
    );

    // Seed Data (Custom Resource)
    new custom.AwsCustomResource(this, "BooksSeedData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            Books: generateBatch(books),
            Reviews: generateBatch(reviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("booksddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [booksTable.tableArn, reviewsTable.tableArn],
      }),
    });

    // API Gateway
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Books API",
      deployOptions: { stageName: "dev" },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // Define Cognito Authorizer
    const cognitoAuthorizer = new apig.CognitoUserPoolsAuthorizer(
      this,
      "APIGatewayAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    // Add resources and methods with Cognito Authorization
    const booksEndpoint = api.root.addResource("books");

    // GET /books - Public (no authentication)
    booksEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllBooksFn, { proxy: true })
    );

    // GET /books/{bookId} - Authenticated
    const bookEndpoint = booksEndpoint.addResource("{bookId}");
    bookEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getBookByIdFn, { proxy: true }),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apig.AuthorizationType.COGNITO,
      }
    );

    // POST /books - Authenticated
    booksEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newBookFn, { proxy: true }),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apig.AuthorizationType.COGNITO,
      }
    );

    // POST /books/{bookId}/reviews - Authenticated
    const bookReviewsEndpoint = bookEndpoint.addResource("reviews");
    bookReviewsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newReviewFn, { proxy: true }),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apig.AuthorizationType.COGNITO,
      }
    );

    // PUT /books/{bookId}/reviews/{reviewerName} - Authenticated
    const reviewEndpoint = bookReviewsEndpoint.addResource("{reviewerName}");
    reviewEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateReviewFn, { proxy: true }),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apig.AuthorizationType.COGNITO,
      }
    );

    // Grant permissions to Lambda functions
    booksTable.grantReadData(getBookByIdFn);
    booksTable.grantReadData(getAllBooksFn);
    booksTable.grantReadWriteData(newBookFn);
    reviewsTable.grantReadWriteData(newReviewFn);
    reviewsTable.grantReadWriteData(updateReviewFn);
  }

  private addAuthRoute(
    resourceName: string,
    method: string,
    fnName: string,
    fnEntry: string
  ): void {
    // Create a Lambda function for the authentication route
    const authFn = new lambdanode.NodejsFunction(this, fnName, {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/auth/${fnEntry}`,
      handler: "handler",
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        USER_POOL_ID: this.userPoolId,
        USER_POOL_CLIENT_ID: this.userPoolClientId,
      },
    });

    // API Gateway route for authentication
    const resource = this.authApi.root.addResource(resourceName);
    resource.addMethod(
      method,
      new apig.LambdaIntegration(authFn, { proxy: true })
    );
  }
}
