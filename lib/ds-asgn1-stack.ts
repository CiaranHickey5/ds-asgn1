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
      partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER }, // numeric primary key
      sortKey: { name: "authorName", type: dynamodb.AttributeType.STRING }, // string secondary key
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Be careful with this in production
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

    // Output table names for reference
    new cdk.CfnOutput(this, "BooksTableName", {
      value: booksTable.tableName,
    });

    new cdk.CfnOutput(this, "ReviewsTableName", {
      value: reviewsTable.tableName,
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
  }
}
