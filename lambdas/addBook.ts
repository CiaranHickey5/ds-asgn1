import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { bookId, title, author } = body;

    // Validate required fields
    if (!bookId || !title || !author) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "bookId, title, and author are required fields.",
        }),
      };
    }

    // Add the book to DynamoDB
    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME!,
        Item: {
          bookId: bookId,
          title: title,
          author: author,
        },
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Book added successfully!" }),
    };
  } catch (error: any) {
    console.error("Error adding book:", error);
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
