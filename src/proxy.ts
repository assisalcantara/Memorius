import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Se o host começar com "app." e o caminho for "/", reescreve para "/login"
  if (host.startsWith("app.") && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // O proxy roda apenas na rota raiz, evitando interceptar
  // estáticos, imagens, rotas de api ou o próprio /login.
  matcher: ["/"],
};
