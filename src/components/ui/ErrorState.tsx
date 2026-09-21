import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props { message: string; onRetry?: () => void; }
const ErrorState: React.FC<Props> = ({ message, onRetry }) => <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-200" role="alert"><AlertCircle className="h-6 w-6" aria-hidden="true" /><p className="m-0">{message}</p>{onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold"><RefreshCw className="h-3.5 w-3.5" />Reintentar</button>}</div>;
export default ErrorState;
