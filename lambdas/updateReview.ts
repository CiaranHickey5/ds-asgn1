import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const parameters = event?.pathParameters;
    const reviewerName = parameters?.reviewerName; // Use reviewerName to identify the review
    const body = event.body ? JSON.parse(event.body) : {};

    const { bookId, reviewText, lastUpdated } = body;

    if (!reviewerName || !bookId || !reviewText || !lastUpdated) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message:
            "reviewerName, bookId, reviewText, and lastUpdated are required fields.",
        }),
      };
    }

    // Update the review details only if the lastUpdated attribute matches the provided value
    const updateResponse = await ddbDocClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { reviewerName, bookId }, // Use reviewerName and bookId as the composite key
        UpdateExpression:
          "SET reviewText = :reviewText, lastUpdated = :newLastUpdated",
        ConditionExpression:
          "lastUpdated = :expectedLastUpdated OR attribute_not_exists(lastUpdated)",
        ExpressionAttributeValues: {
          ":reviewText": reviewText,
          ":newLastUpdated": new Date().toISOString(),
          ":expectedLastUpdated": lastUpdated,
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Review updated successfully!",
        data: updateResponse.Attributes,
      }),
    };
  } catch (error: any) {
    console.error("Error updating review:", JSON.stringify(error));

    // Return error message if condition fails
    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 409,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message:
            "Update failed: lastUpdated does not match or review was updated by someone else.",
        }),
      };
    }

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
