import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  bloquearRotaNaLanding,
  raizDaPlataformaVaiProLogin,
} from "@/lib/lancamento";

// Rotas da área do aluno (exigem login). A inscrição pública ("/") fica de fora.
const ROTAS_PROTEGIDAS = ["/painel", "/modulos", "/master"];
// Rotas de entrada: usuário já logado não precisa vê-las.
const ROTAS_DE_AUTH = ["/login", "/primeiro-acesso"];

/**
 * Proxy (antigo middleware no Next < 16). Renova a sessão do Supabase a cada
 * requisição e barra acesso não autenticado à área do aluno.
 */
export async function proxy(request: NextRequest) {
  // Pré-lançamento: no domínio principal, rota de plataforma volta pra landing.
  // Atrás do nginx, o domínio de verdade vem no header Host (nextUrl.hostname
  // reflete o bind local do next start).
  const host =
    request.headers.get("host")?.split(":")[0] ?? request.nextUrl.hostname;
  if (
    bloquearRotaNaLanding(host, request.nextUrl.pathname, {
      DOMINIO_LANDING: process.env.DOMINIO_LANDING,
      PLATAFORMA_LIBERADA: process.env.PLATAFORMA_LIBERADA,
    })
  ) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  // Link do aluno (app.<domínio>): a raiz vai direto pro login.
  if (
    raizDaPlataformaVaiProLogin(host, request.nextUrl.pathname, {
      DOMINIO_LANDING: process.env.DOMINIO_LANDING,
      PLATAFORMA_LIBERADA: process.env.PLATAFORMA_LIBERADA,
    })
  ) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() valida o token com o Supabase e dispara o refresh quando preciso.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && ROTAS_PROTEGIDAS.some((p) => path.startsWith(p))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("redirect", path);
    return NextResponse.redirect(redirect);
  }

  if (user && ROTAS_DE_AUTH.some((p) => path.startsWith(p))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/painel";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    // Roda em tudo, menos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
