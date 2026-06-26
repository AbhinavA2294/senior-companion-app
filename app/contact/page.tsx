import { redirect } from "next/navigation";

// The footer links to /contact; redirect to the canonical /support page.
export default function ContactRedirect() {
  redirect("/support");
}
