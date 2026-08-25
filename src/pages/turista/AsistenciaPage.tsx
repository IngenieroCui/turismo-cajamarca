import React from 'react';
import {
  PhoneCall,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  FileText,
  Sparkles,
  HeartPulse,
} from 'lucide-react';

export const AsistenciaPage: React.FC = () => {
  const emergencyNumbers = [
    { title: 'Policía Turística & Estación Cajamarca', number: '123 / (+57) 310 211 4567', icon: ShieldCheck, color: 'text-blue-400 border-blue-500/20 bg-blue-500/10' },
    { title: 'Hospital Santa Lucía de Cajamarca', number: '(+57) 314 892 1234', icon: HeartPulse, color: 'text-rose-400 border-rose-500/20 bg-rose-500/10' },
    { title: 'Cuerpo de Bomberos Cajamarca', number: '(+57) 311 445 6789', icon: AlertTriangle, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
    { title: 'Defensa Civil Colombiana (Seccional Tolima)', number: '(+57) 315 789 0123', icon: PhoneCall, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
  ];

  const handleWhatsAppHelp = () => {
    const message = encodeURIComponent(
      'Hola, requiero asistencia al viajero en el municipio de Cajamarca Tolima.'
    );
    window.open(`https://wa.me/573025091063?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER ASISTENCIA */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-500/20 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-teal-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
              <PhoneCall className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" /> Atención 24/7 al Viajero
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] my-0">
                Asistencia & Emergencias en Cajamarca Tolima
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                Líneas directas de auxilio, policía turística y puntos de información en el municipio.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER CANAL OFICIAL WHATSAPP */}
      <div className="p-6 rounded-3xl bg-emerald-600/20 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-emerald-300 my-0 flex items-center justify-center sm:justify-start gap-2">
            <MessageCircle className="w-5 h-5" /> ¿Necesitas ayuda inmediata durante tu ruta?
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Escríbenos a la central de asistencia al turista de Cajamarca Tolima para guiarte en tiempo real.
          </p>
        </div>
        <button
          onClick={handleWhatsAppHelp}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Solicitar Asistencia por WhatsApp</span>
        </button>
      </div>

      {/* DIRECTORIO DE EMERGENCIAS */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)] my-0 uppercase tracking-wider">
          Directorio de Entidades de Apoyo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyNumbers.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex items-center gap-4 shadow-lg"
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                  <IconComp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] my-0">{item.title}</h4>
                  <p className="text-xs font-mono text-[var(--color-primary-light)] font-bold">{item.number}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECOMENDACIONES DE SEGURIDAD */}
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-400" />
          <span>Recomendaciones de Seguridad para Senderismo y Trekking</span>
        </h3>
        <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc pl-5 leading-relaxed">
          <li>Al visitar el <strong>Bosque de Palmas de Cera en Anaime o Toche</strong>, ingresa siempre con guías certificados y equipo adecuado para montaña.</li>
          <li>Revisa el estado del clima antes de iniciar caminatas hacia el <strong>Volcán Machín</strong> o la cuenca del Río Anaime.</li>
          <li>Lleva protector solar, impermeable y calzado de agarre para senderos húmedos de alta montaña.</li>
          <li>Respeta el entorno natural y conserva limpia la Despensa Agrícola de Colombia.</li>
        </ul>
      </div>
    </div>
  );
};

export default AsistenciaPage;
