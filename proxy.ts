import { auth } from "@/lib/neon-auth"

export default auth.middleware({ loginUrl: "/auth/login" })

export const config = {
  matcher: ["/admin/:path*"],
}
