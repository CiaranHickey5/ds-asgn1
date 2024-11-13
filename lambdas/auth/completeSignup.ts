import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  ConfirmSignUpCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !body.username || !body.code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "username and code are required" }),
      };
    }

    const command = new ConfirmSignUpCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID!,
      Username: body.username,
      ConfirmationCode: body.code,
    });

    const response = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Account confirmed", response }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Confirmation failed",
        error: (err as Error).message,
      }),
    };
  }
};
