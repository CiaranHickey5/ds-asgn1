import { APIGatewayEvent, Context, Callback } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (
  event: APIGatewayEvent,
  context: Context,
  callback: Callback
) => {
  const bookId = event.pathParameters?.bookId;

  if (!bookId) {
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({ message: "Book ID is required" }),
    });
    return;
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      bookId: Number(bookId), // Ensure the bookId is treated as a number
    },
  };

  try {
    const result = await dynamoDb.get(params).promise();
    if (!result.Item) {
      callback(null, {
        statusCode: 404,
        body: JSON.stringify({ message: `Book not found with ID: ${bookId}` }),
      });
      return;
    }

    callback(null, {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    });
  } catch (error) {
    console.error("Error retrieving book:", error);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    });
  }
};
