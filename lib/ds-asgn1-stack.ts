import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { books, reviews } from "../seed/books";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class DsAsgn1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Books Table with composite primary key
    const booksTable = new dynamodb.Table(this, "BooksTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Books",
    });

    // Create Reviews Table with a partition key on bookId and sort key on reviewerName
    const reviewsTable = new dynamodb.Table(this, "ReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Reviews",
    });

    // Functions

    // Lambda for Get Book by Id
    const getBookByIdFn = new lambdanode.NodejsFunction(this, "GetBookByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getBookById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Lambda for Get All Books
    const getAllBooksFn = new lambdanode.NodejsFunction(this, "GetAllBooksFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllBooks.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Lambda for Add Book
    const newBookFn = new lambdanode.NodejsFunction(this, "AddBookFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addBook.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: booksTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Lambda for Add Review
    const newReviewFn = new lambdanode.NodejsFunction(this, "AddReviewFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/addReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REVIEWS_TABLE_NAME: reviewsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    // Seed data into the tables using custom resource
    new custom.AwsCustomResource(this, "BooksSeedData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            Books: generateBatch(books), // GenerateBatch formats the seed data
            Reviews: generateBatch(reviews), // Format reviews for seeding
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("booksddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [booksTable.tableArn, reviewsTable.tableArn],
      }),
    });

    // Permissions
    booksTable.grantReadData(getBookByIdFn);
    booksTable.grantReadData(getAllBooksFn);
    reviewsTable.grantReadData(getBookByIdFn);
    booksTable.grantReadWriteData(newBookFn);
    reviewsTable.grantReadWriteData(newReviewFn);

    // REST API Gateway Integration
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Books API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // Endpoints

    // Define the "books" resource in the API Gateway
    const booksEndpoint = api.root.addResource("books");

    // GET /books - Get all books
    booksEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllBooksFn, { proxy: true })
    );

    // GET /books/{bookId} - Get a book by ID
    const bookEndpoint = booksEndpoint.addResource("{bookId}");
    bookEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getBookByIdFn, { proxy: true })
    );

    // POST /books - Add a new book
    booksEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newBookFn, { proxy: true })
    );

    // POST /books/{bookId}/reviews - Add a new review for a book
    const bookReviewsEndpoint = bookEndpoint.addResource("reviews");
    bookReviewsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newReviewFn, { proxy: true })
    );
  }
}
