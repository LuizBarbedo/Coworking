"use client";

// Lista genérica com reordenação por arrastar-e-soltar (+ teclado) para o
// master definir a ordem. Usa Pointer Events (funciona igual em toque e mouse
// — o drag nativo do HTML5 não dispara no celular) e sem dependência extra. O
// arrasto começa pela alça; o resto do card continua clicável (navega). A
// ordem é otimista: reordena na hora e persiste em background; se a action
// falhar, reverte e avisa. Botões ↑/↓ garantem acesso por teclado.

import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import type { AcaoState } from "@/lib/acao";

function mover<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length || de === para) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

export function ListaOrdenavel<T extends { id: string }>({
  itens: iniciais,
  aoReordenar,
  renderItem,
  rotulo,
  vazio,
  dataTour,
}: {
  itens: T[];
  /** Persiste a nova ordem (lista de ids). Devolve o feedback da action. */
  aoReordenar: (novaOrdem: string[]) => Promise<AcaoState>;
  renderItem: (item: T) => React.ReactNode;
  /** Rótulo do item para o aria-label dos botões de mover. */
  rotulo: (item: T) => string;
  /** Conteúdo mostrado quando não há itens. */
  vazio: React.ReactNode;
  dataTour?: string;
}) {
  const [itens, setItens] = useState(iniciais);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const { mostrar } = useToast();

  // Refs pros <li> (medir posição na tela) e estado vivo do arrasto — os
  // handlers de ponteiro não podem depender do `itens` do closure (fica velho).
  const lisRef = useRef<(HTMLLIElement | null)[]>([]);
  const indiceRef = useRef<number | null>(null);
  const ordemViva = useRef<T[]>(iniciais);
  const antesDoArrasto = useRef<T[]>(iniciais);

  /** Persiste `nova` se a ordem mudou; reverte pra `reverterPara` se falhar. */
  function persistir(nova: T[], reverterPara: T[]) {
    const ids = nova.map((x) => x.id);
    if (ids.join() === reverterPara.map((x) => x.id).join()) return;
    iniciarTransicao(async () => {
      const resultado = await aoReordenar(ids);
      if (resultado && "error" in resultado) {
        setItens(reverterPara);
        mostrar(resultado.error, "erro");
      } else if (resultado && "ok" in resultado) {
        mostrar(resultado.ok, "ok");
      }
    });
  }

  /** Botões ↑/↓ (e teclado): move um passo e persiste. */
  function moverUmPasso(de: number, para: number) {
    const nova = mover(itens, de, para);
    if (nova === itens) return;
    setItens(nova);
    persistir(nova, itens);
  }

  /** Índice de destino a partir da posição vertical do ponteiro. */
  function alvoDaPosicao(clientY: number): number {
    const lis = lisRef.current;
    for (let j = 0; j < lis.length; j++) {
      const el = lis[j];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return j;
    }
    return itens.length - 1;
  }

  function aoDescer(i: number, e: React.PointerEvent) {
    // Só o botão principal (toque, ou clique esquerdo do mouse).
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sem captura o arrasto ainda funciona enquanto o ponteiro fica na alça.
    }
    indiceRef.current = i;
    ordemViva.current = itens;
    antesDoArrasto.current = itens;
    setArrastando(i);
  }

  function aoMover(e: React.PointerEvent) {
    const de = indiceRef.current;
    if (de === null) return;
    const para = alvoDaPosicao(e.clientY);
    if (para === de || para < 0) return;
    const nova = mover(ordemViva.current, de, para);
    ordemViva.current = nova;
    indiceRef.current = para;
    setArrastando(para);
    setItens(nova);
  }

  function aoSoltar() {
    if (indiceRef.current === null) return;
    indiceRef.current = null;
    setArrastando(null);
    persistir(ordemViva.current, antesDoArrasto.current);
  }

  if (itens.length === 0) return <>{vazio}</>;

  return (
    <ul
      className="escalonado mt-3 space-y-3"
      data-tour={dataTour}
      aria-busy={pendente}
    >
      {itens.map((item, i) => (
        <li
          key={item.id}
          ref={(el) => {
            lisRef.current[i] = el;
          }}
          className={`flex items-center gap-2 rounded-xl border bg-superficie p-4 shadow-sm transition-shadow duration-300 hover:border-brand-300 hover:shadow-md ${
            arrastando === i
              ? "border-brand-400 opacity-70 ring-2 ring-brand-200"
              : "border-slate-200"
          }`}
        >
          <span
            onPointerDown={(e) => aoDescer(i, e)}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSoltar}
            aria-hidden="true"
            title="Arraste para reordenar"
            className="flex-none touch-none cursor-grab select-none text-slate-400 active:cursor-grabbing"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.4" />
              <circle cx="11" cy="3" r="1.4" />
              <circle cx="5" cy="8" r="1.4" />
              <circle cx="11" cy="8" r="1.4" />
              <circle cx="5" cy="13" r="1.4" />
              <circle cx="11" cy="13" r="1.4" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">{renderItem(item)}</div>

          <div className="flex flex-none flex-col">
            <button
              type="button"
              onClick={() => moverUmPasso(i, i - 1)}
              disabled={i === 0}
              aria-label={`Mover ${rotulo(item)} para cima`}
              className="rounded p-0.5 text-slate-400 transition hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10l4-4 4 4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => moverUmPasso(i, i + 1)}
              disabled={i === itens.length - 1}
              aria-label={`Mover ${rotulo(item)} para baixo`}
              className="rounded p-0.5 text-slate-400 transition hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
