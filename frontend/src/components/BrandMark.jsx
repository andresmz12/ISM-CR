import ismMark from '../assets/ism-mark.png';

// Isotipo de ISM Consulting Services en un chip blanco: el logo real tiene
// trazos negros que desaparecen sobre fondos oscuros (sidebar, panel del
// login), así que siempre va sobre blanco para quedar legible en cualquier
// lado.
export default function BrandMark({ className = 'h-9 w-9', imgClassName = 'h-6 w-6' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md shadow-black/10 ${className}`}>
      <img src={ismMark} alt="ISM" className={`object-contain ${imgClassName}`} />
    </span>
  );
}
