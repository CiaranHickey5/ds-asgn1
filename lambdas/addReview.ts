import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const { bookId } = event?.pathParameters ?? {};

    const body = event.body ? JSON.parse(event.body) : {};
    const { reviewerName, reviewText } = body;

    // Validate required fields
    if (!bookId || !reviewerName || !reviewText) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "bookId, reviewerName, and reviewText are required fields.",
        }),
      };
    }

    // Add the review to the DynamoDB Reviews table
    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.REVIEWS_TABLE_NAME!,
        Item: {
          bookId: parseInt(bookId),
          reviewerName: reviewerName,
          reviewText: reviewText,
          createdAt: new Date().toISOString(),
        },
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Review added successfully!" }),
    };
  } catch (error: any) {
    console.error("Error adding review:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Function to create DynamoDB Document Client
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
