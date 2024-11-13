import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body || !body.accessToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "accessToken is required" }),
      };
    }

    const command = new GlobalSignOutCommand({ AccessToken: body.accessToken });
    const response = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Signout successful", response }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Signout failed",
        error: (err as Error).message,
      }),
    };
  }
};
