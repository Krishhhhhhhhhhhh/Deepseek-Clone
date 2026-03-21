import { Webhook } from 'svix';
import connectDB from '../../../../config/db';
import User from '../../../../models/User';
import { headers } from 'next/headers';

export async function POST(req) {
  try {
    const wh = new Webhook(process.env.SIGNING_SECRET);

    const headerPayload = await headers();

    const svixheaders = {
      "svix-id": headerPayload.get("svix-id"),
      "svix-signature": headerPayload.get("svix-signature"),
      "svix-timestamp": headerPayload.get("svix-timestamp"),
    };

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const { data, type } = wh.verify(body, svixheaders);

console.log("📩 Webhook event:", type);

const userData = {
  _id: data.id,
  email: data.email_addresses?.[0]?.email_address,
  name: `${data.first_name} ${data.last_name}`,
  image: data.image_url,
};

await connectDB();
console.log("🔥 DB connected & webhook triggered");

    switch (type) {
      case 'user.created':
      case 'user.updated':
        await User.findByIdAndUpdate(data.id, userData, { upsert: true });
        break;

      case 'user.deleted':
        await User.findByIdAndDelete(data.id);
        break;

      default:
        break;
    }

    return Response.json({ message: "Event received" });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error processing webhook", { status: 400 });
  }
}