import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const body = event.body ? JSON.parse(event.body) : {};
    const { bookId, reviewerName, reviewText } = body;

    // Validate required fields
    if (!bookId || !reviewerName || !reviewText) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "bookId, reviewerName, and reviewText are required fields.",
        }),
      };
    }

    // Add the review to the DynamoDB table
    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        Item: {
          bookId: bookId,
          reviewerName: reviewerName,
          reviewText: reviewText,
        },
      })
    );

    return {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Review added successfully!" }),
    };
  } catch (error: any) {
    console.error("Error adding review:", JSON.stringify(error));
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
