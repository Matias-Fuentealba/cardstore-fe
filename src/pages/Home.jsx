import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCLP } from '../api';
import optcgImg   from '../assets/optcg.webp';
import ptcgImg    from '../assets/ptcg.webp';
import rbtcgImg   from '../assets/rbtcg.jpg';
import charivImg  from '../assets/charivmax.webp';

// ─── Rarity badge color ───────────────────────────────────────────────────────
const RARITY_STYLES = {
  'starlight rare': 'bg-yellow-400 text-slate-900',
  'secret rare':    'bg-pink-500 text-white',
  'ultra rare':     'bg-slate-900 text-white',
  'mythic':         'bg-indigo-600 text-white',
  'rare':           'bg-orange-500 text-white',
  'common':         'bg-slate-500 text-white',
};
function rarityStyle(r) {
  return RARITY_STYLES[(r || '').toLowerCase()] || 'bg-slate-700 text-white';
}

// ─── Featured card tile ───────────────────────────────────────────────────────
function FeaturedCard({ card }) {
  const inv   = card.inventory && typeof card.inventory === 'object' ? card.inventory : {};
  const lang  = inv.default || Object.values(inv)[0] || {};
  const price = (lang.nm || lang.lp || lang.mp || lang.hp)?.price ?? 0;

  return (
    <Link
      to={`/card/${card.id}`}
      className="group bg-white/5 border border-white/10 p-4 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all block"
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-4 bg-black/20">
        <img
          src={card.imageSm || card.image || ''}
          alt={card.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
        <span className={`absolute top-2 left-2 ${rarityStyle(card.rarity)} text-[10px] font-black px-2 py-0.5 rounded-full uppercase`}>
          {card.rarity || ''}
        </span>
      </div>
      <h4 className="font-bold text-white truncate text-sm mb-0.5">{card.name}</h4>
      <p className="text-xs text-gray-400 mb-3">{card.setName || card.set || ''}</p>
      <span className="text-base font-black text-violet-400">{formatCLP(price)}</span>
    </Link>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────
const GAME_CATEGORIES = [
  { id: 'onepiece',  name: 'One Piece TCG',  img: optcgImg  },
  { id: 'pokemon',   name: 'Pokémon TCG',    img: ptcgImg   },
  { id: 'riftbound', name: 'Riftbound TCG',  img: rbtcgImg  },
];

const HERO_CARDS = [
  { src: 'https://images.pokemontcg.io/swsh8/114_hires.png',  rotate: '-rotate-6', alt: 'Mew VMAX'       },
  { src: 'https://images.pokemontcg.io/swsh11/186_hires.png', rotate: 'rotate-3',  alt: 'Lugia VSTAR'    },
  { src: charivImg,                                           rotate: 'rotate-12', alt: 'Charizard VMAX' },
  { src: 'https://images.pokemontcg.io/swsh3/19_hires.png',   rotate: '-rotate-3', alt: 'Charizard V'    },
];

const META_CARDS = [
  { name: 'Charizard ex',  img: 'https://images.pokemontcg.io/sv3pt5/54_hires.png',  pct: '12.5%' },
  { name: 'Lugia VSTAR',   img: 'https://images.pokemontcg.io/swsh11/186_hires.png', pct: '8.2%'  },
  { name: 'Gardevoir ex',  img: 'https://images.pokemontcg.io/sv2/86_hires.png',     pct: '15.1%' },
  { name: 'Mew VMAX',      img: 'https://images.pokemontcg.io/swsh8/114_hires.png',  pct: '5.4%'  },
  { name: 'Mewtwo ex',     img: 'https://images.pokemontcg.io/sv3pt5/193_hires.png', pct: '2.3%'  },
];
// Duplicate for seamless marquee loop
const MARQUEE_ITEMS = [...META_CARDS, ...META_CARDS];

// ─── Home page ────────────────────────────────────────────────────────────────
export function Home() {
  const [featured,     setFeatured]     = useState([]);
  const [featLoading,  setFeatLoading]  = useState(true);
  const [email,        setEmail]        = useState('');

  useEffect(() => {
    api.cards.featured()
      .then(res => setFeatured(Array.isArray(res?.data || res) ? (res?.data || res) : []))
      .catch(() => {})
      .finally(() => setFeatLoading(false));
  }, []);

  function handleNewsletter(e) {
    e.preventDefault();
    if (!email.trim()) return;
    showToast('¡Te has suscrito exitosamente!', 'success');
    setEmail('');
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* ══ Hero ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div className="z-10">
              <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-violet-600/15 text-violet-400 text-xs font-bold uppercase tracking-wider mb-6">
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                Nuevas llegadas: Phantoms of the Past
              </span>
              <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
                Encuentra las cartas{' '}
                <span className="text-violet-400">perfectas</span>{' '}
                para tu deck
              </h1>
              <p className="text-lg text-gray-400 mb-10 max-w-xl leading-relaxed">
                Compra singles de Pokémon TCG al mejor precio del mercado. Inventario actualizado
                diariamente con las cartas más competitivas del meta.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/singles"
                  className="px-8 py-4 bg-violet-600 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-600/30 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Explorar cartas <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link
                  to="/singles"
                  className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center"
                >
                  Ver cartas populares
                </Link>
              </div>
            </div>

            {/* Card grid — desktop only */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-violet-400/10 rounded-full blur-3xl" />
              <div className="relative grid grid-cols-2 gap-6">
                <div className="space-y-6 pt-12">
                  {HERO_CARDS.slice(0, 2).map(c => (
                    <div key={c.alt} className={`aspect-[3/4] rounded-2xl shadow-2xl ${c.rotate} hover:rotate-0 transition-transform duration-500 overflow-hidden bg-black/20`}>
                      <img src={c.src} alt={c.alt} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  {HERO_CARDS.slice(2).map(c => (
                    <div key={c.alt} className={`aspect-[3/4] rounded-2xl shadow-2xl ${c.rotate} hover:rotate-0 transition-transform duration-500 overflow-hidden bg-black/20`}>
                      <img src={c.src} alt={c.alt} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Game categories ═══════════════════════════════════════════════════ */}
      <section className="py-20 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <h2 className="text-3xl font-bold">Explora por Juego</h2>
          <p className="text-gray-500 mt-2">Encontrá las singles que buscás por juego</p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {GAME_CATEGORIES.map(g => (
            <Link
              key={g.id}
              to={`/singles/${g.id}`}
              className="group relative block aspect-[16/10] overflow-hidden rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
              <img
                src={g.img}
                alt={g.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <h3 className="text-2xl font-bold text-white mb-1">{g.name}</h3>
                <p className="text-gray-300 text-sm">Ver todas las singles</p>
              </div>
              <div className="absolute top-4 right-4 z-20 bg-white/20 backdrop-blur-md p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined">arrow_outward</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══ Featured cards ════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold">Cartas Destacadas</h2>
              <p className="text-gray-500 mt-2">Nuestra selección de cartas más buscadas esta semana</p>
            </div>
            <Link to="/singles" className="text-violet-400 font-bold hover:underline flex items-center gap-1 text-sm">
              Ver todo <span className="material-symbols-outlined text-base">east</span>
            </Link>
          </div>

          {featLoading && (
            <div className="flex justify-center py-16">
              <span className="material-symbols-outlined text-4xl text-violet-400 animate-spin">progress_activity</span>
            </div>
          )}
          {!featLoading && featured.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map(card => <FeaturedCard key={card.id} card={card} />)}
            </div>
          )}
          {!featLoading && featured.length === 0 && (
            <p className="text-center text-gray-500 py-16">No hay cartas destacadas disponibles.</p>
          )}
        </div>
      </section>

      {/* ══ Benefits ══════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: 'local_shipping', title: 'Envío Rápido',       desc: 'Enviamos tus pedidos en menos de 24 horas con seguimiento garantizado.'                   },
              { icon: 'verified',       title: 'Cartas Verificadas',  desc: 'Autenticidad 100% garantizada y estado de las cartas rigurosamente revisado.'             },
              { icon: 'security',       title: 'Pagos Seguros',       desc: 'Tus transacciones están protegidas con los estándares de seguridad más altos.'            },
            ].map(b => (
              <div key={b.title} className="text-center group">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-violet-600/20 group-hover:border-violet-500/50 transition-all">
                  <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-violet-400 transition-colors">{b.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{b.title}</h3>
                <p className="text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Trending marquee — oculto hasta tener datos reales ═══════════════ */}
      {false && (
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-3xl font-bold">Trending Meta Cards</h2>
        </div>
        <div className="relative w-full overflow-hidden">
          <div
            className="flex gap-6 px-4 animate-slide-left hover:[animation-play-state:paused]"
            style={{ width: 'max-content' }}
          >
            {MARQUEE_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex-none w-64 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4"
              >
                <div className="w-16 h-16 bg-black/30 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h5 className="font-bold text-sm truncate w-32">{item.name}</h5>
                  <p className="text-xs text-violet-400 font-bold">↑ {item.pct} meta usage</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ══ Newsletter ════════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-violet-600 rounded-[2rem] px-8 py-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12 blur-3xl" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl font-bold mb-4">No te pierdas ningún restock</h2>
              <p className="text-lg text-white/80 mb-10">
                Suscríbete para recibir alertas sobre cartas raras y ofertas exclusivas.
              </p>
              <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  required
                  className="flex-1 px-6 py-4 rounded-xl bg-white/10 border-2 border-white/60 text-white placeholder-white/60 focus:border-white focus:ring-0 outline-none"
                />
                <button
                  type="submit"
                  className="bg-white text-violet-600 font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Suscribirse
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Footer ════════════════════════════════════════════════════════════ */}
      <footer className="bg-black/30 border-t border-white/5 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          <div>
            <div className="flex items-center gap-2 mb-6">
              <img src="https://i.imgur.com/dVTFMJf.png" alt="La Tech TCG" className="h-[80px] w-auto object-contain" />
              <span className="text-xl font-bold tracking-tight">La Tech TCG</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              La tienda para coleccionistas y jugadores competitivos de TCG en Chile.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-6">Tienda</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/singles" className="hover:text-violet-400 transition-colors">Singles</Link></li>
              <li><Link to="/sellado" className="hover:text-violet-400 transition-colors">Sellado</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/terminos" className="hover:text-violet-400 transition-colors">Términos y Condiciones</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Contacto</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><a href="mailto:pagos@latechtcg.com" className="hover:text-violet-400 transition-colors">pagos@latechtcg.com</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-xs">
          <p>© 2025 La Tech TCG. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link to="/terminos" className="hover:text-violet-400 transition-colors">Términos y Condiciones</Link>
            <a href="mailto:pagos@latechtcg.com" className="hover:text-violet-400 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
