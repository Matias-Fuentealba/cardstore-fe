import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    id: 'general',
    title: '1. Información general',
    content: `La Tech TCG es una tienda en línea dedicada a la compra y venta de cartas coleccionables (TCG) en Chile. Al acceder y utilizar este sitio web, el usuario acepta íntegramente los presentes Términos y Condiciones. Si no está de acuerdo con alguno de ellos, le pedimos que se abstenga de utilizar la plataforma.`,
  },
  {
    id: 'productos',
    title: '2. Productos y descripción',
    content: `Todos los productos ofrecidos en La Tech TCG son cartas físicas originales de colección. Cada carta incluye una descripción del estado según los estándares internacionales del mercado TCG:

• Near Mint (NM): Sin marcas visibles de uso. Condición casi perfecta.
• Lightly Played (LP): Mínimas marcas de uso que no afectan la jugabilidad.
• Moderately Played (MP): Marcas visibles de uso. Aceptable para juego casual.
• Heavily Played (HP): Desgaste notorio. Solo recomendada para colección o proxies.

Las imágenes del sitio son referenciales. El estado real de cada carta es el indicado en la descripción del producto.`,
  },
  {
    id: 'precios',
    title: '3. Precios y pagos',
    content: `Todos los precios están expresados en Pesos Chilenos (CLP) e incluyen IVA cuando corresponda. La Tech TCG se reserva el derecho de modificar precios en cualquier momento sin previo aviso, aunque los pedidos ya confirmados mantendrán el precio pactado al momento de la compra.

Los medios de pago disponibles son:
• Mercado Pago (tarjeta de débito, crédito y saldo MP)
• WebPay Plus (tarjeta de débito y crédito emitidas en Chile)
• Transferencia bancaria (el pedido se procesa una vez confirmado el depósito)

La Tech TCG no almacena datos de tarjetas de crédito ni débito. Toda la información de pago es procesada directamente por los proveedores de pago certificados.`,
  },
  {
    id: 'envios',
    title: '4. Envíos',
    content: `Despachamos a todo Chile. Los pedidos se procesan y despachan en un plazo de 1 a 3 días hábiles tras la confirmación del pago. Los tiempos de entrega dependen del servicio de courier seleccionado y la región de destino.

El costo de envío es responsabilidad del comprador y se calcula al momento del checkout según la comuna de destino. La Tech TCG no se hace responsable por retrasos atribuibles al courier una vez despachado el pedido.

Todos los pedidos incluyen número de seguimiento que será enviado al correo registrado.`,
  },
  {
    id: 'devoluciones',
    title: '5. Devoluciones y garantías',
    content: `De acuerdo con la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores de Chile, el cliente tiene derecho a retracto dentro de los 10 días hábiles desde la recepción del producto, siempre que este no haya sido usado y se encuentre en su estado original.

Se aceptan devoluciones en los siguientes casos:
• El producto recibido no corresponde al pedido.
• El estado de la carta difiere significativamente del descrito.
• El producto presenta daños atribuibles al embalaje o despacho.

Para iniciar una devolución, el cliente debe contactarnos dentro del plazo indicado a través de pagos@latechtcg.com con fotografías del producto recibido. Los gastos de envío de la devolución serán cubiertos por La Tech TCG cuando el error sea atribuible a nuestra tienda.

No se aceptan devoluciones por diferencias subjetivas en la apreciación del estado de la carta cuando este coincide con el descrito.`,
  },
  {
    id: 'privacidad',
    title: '6. Privacidad y datos personales',
    content: `La Tech TCG recopila datos personales (nombre, correo, dirección, RUT) únicamente para procesar pedidos y mejorar la experiencia del usuario. Esta información no será vendida ni cedida a terceros, salvo cuando sea necesario para el procesamiento del pago o el despacho del pedido.

El usuario puede solicitar la eliminación de sus datos en cualquier momento contactándonos a pagos@latechtcg.com.`,
  },
  {
    id: 'propiedad',
    title: '7. Propiedad intelectual',
    content: `Las imágenes de cartas utilizadas en este sitio son propiedad de sus respectivos editores (Nintendo, The Pokémon Company, Bandai, Riot Games, etc.) y se utilizan con fines referenciales e informativos. La Tech TCG no reclama ningún derecho sobre dichas imágenes.

El diseño, logotipos y contenido propio del sitio son propiedad de La Tech TCG y no pueden ser reproducidos sin autorización.`,
  },
  {
    id: 'modificaciones',
    title: '8. Modificaciones',
    content: `La Tech TCG se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización correspondiente. El uso continuado del sitio tras la publicación de cambios implica la aceptación de los nuevos términos.`,
  },
  {
    id: 'contacto',
    title: '9. Contacto',
    content: `Para cualquier consulta, reclamo o sugerencia puedes contactarnos a:

📧 pagos@latechtcg.com

Nuestro equipo responde en un plazo máximo de 2 días hábiles.`,
  },
];

export function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">

        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-10">
          <Link to="/" className="hover:text-violet-400 transition-colors">Home</Link>
          <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
          <span className="text-white font-medium">Términos y Condiciones</span>
        </nav>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Términos y Condiciones</h1>
          <p className="text-gray-400 text-sm">Última actualización: junio 2025</p>
        </div>

        {/* Índice */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10">
          <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-widest text-gray-400">Contenido</h2>
          <ul className="space-y-2">
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Secciones */}
        <div className="space-y-10">
          {SECTIONS.map(s => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="text-xl font-bold text-white mb-4">{s.title}</h2>
              <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver al inicio
          </Link>
        </div>

      </div>
    </div>
  );
}
