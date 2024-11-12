import * as AWS from "aws-sdk";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const parameters = event?.pathParameters;
    const bookId = parameters?.bookId ? parseInt(parameters.bookId) : undefined;

    if (!bookId) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing book Id" }),
      };
    }

    // Check if reviews are requested (case-insensitive)
    const includeReviews =
      event.queryStringParameters?.reviews?.toLowerCase() === "true";

    const bookMetadata = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { bookId },
      })
    );

    if (!bookMetadata.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Invalid book Id" }),
      };
    }

    const responseData: any = { data: bookMetadata.Item };

    // If reviews are requested, fetch review data from the Reviews table
    if (includeReviews) {
      console.log("Reviews data requested for book ID:", bookId);

      // Use QueryCommand to get all reviews for the specified bookId
      const reviewData = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.REVIEWS_TABLE_NAME,
          KeyConditionExpression: "bookId = :bookId",
          ExpressionAttributeValues: {
            ":bookId": bookId,
          },
        })
      );

      // If review data exists, add it to the response
      responseData.reviews = reviewData.Items || [];
      console.log("Review data found:", responseData.reviews);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(responseData),
    };
  } catch (error: any) {
    console.error("Error retrieving book:", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = { wrapNumbers: false };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
