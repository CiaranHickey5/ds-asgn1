import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { bookId, reviewerName } = event?.pathParameters ?? {};
    const body = event.body ? JSON.parse(event.body) : {};
    const { reviewText } = body;

    // Validate required fields
    if (!bookId || !reviewerName || !reviewText) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "bookId, reviewerName, and reviewText are required fields.",
        }),
      };
    }

    // Update the review in DynamoDB
    const updateResponse = await ddbDocClient.send(
      new UpdateCommand({
        TableName: process.env.REVIEWS_TABLE_NAME!,
        Key: { bookId: parseInt(bookId), reviewerName },
        UpdateExpression:
          "SET reviewText = :reviewText, lastUpdated = :lastUpdated",
        ExpressionAttributeValues: {
          ":reviewText": reviewText,
          ":lastUpdated": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Review updated successfully!",
        data: updateResponse.Attributes,
      }),
    };
  } catch (error: any) {
    console.error("Error updating review:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// DynamoDB client initialization
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
