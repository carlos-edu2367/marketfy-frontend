import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para combinar classes do Tailwind condicionalmente.
 * Ex: cn("bg-white", isError && "bg-red-50")
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formata valores monetários para o padrão Brasileiro (BRL).
 * Ex: 10.5 -> "R$ 10,50"
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata datas para exibição amigável.
 * Ex: "20/01/2026 14:30"
 */
export function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}