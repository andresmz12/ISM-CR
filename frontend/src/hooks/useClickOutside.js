import { useEffect } from 'react';

// Cierra popovers al hacer clic/tocar fuera o presionar Escape. No usar onBlur
// del botón para esto: Safari en macOS no enfoca los <button> al hacer clic,
// así que el blur nunca dispara y el popover se queda abierto para siempre.
export default function useClickOutside(ref, enabled, onOutside) {
  useEffect(() => {
    if (!enabled) return undefined;
    function handlePointer(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    function handleKey(e) {
      if (e.key === 'Escape') onOutside();
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, enabled, onOutside]);
}
