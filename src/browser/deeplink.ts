import {devourAuthUser, devourSwapToken} from "@devour/overwolf-sdk";

export async function handleDeeplink(urlString: string) {
	// Handle url
	const url = new URL(urlString);
	const fullToken = url.searchParams.get("token");
	try {
		const limitedToken = await devourSwapToken(fullToken);
		devourAuthUser(limitedToken.oAuthToken);
	} catch (e) {
		console.error("error swapping devour token", e);
	}

}