'use client';

import { useEffect, useState, useRef , useContext} from 'react';
import jsPDF from 'jspdf';
import Swal from "sweetalert2"
import { FileText, LogIn, LogOut, UserPlus } from 'lucide-react';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '@/app/context/AuthContext';
interface Assiduidade {
  id: number;
  funcionario: number;
  funcionario_nome: string;
  entrada: string;
  saida: string | null;
  data: string;
  duracao: string;
}

interface Funcionario {
  id: number;
  nome: string;
}

export default function FormModalAssiduidade() {
  const {accessToken, userId, userName}=useContext(AuthContext)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [assiduidadeList, setAssiduidadeList] = useState<Assiduidade[]>([]);
  const [formData, setFormData] = useState({
    funcionario: '',
    entrada: '',
    data: '',
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedSaida, setEditedSaida] = useState<string>('');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [isRegisteringExit, setIsRegisteringExit] = useState(false);
  const [newFaceName, setNewFaceName] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchAssiduidade();
  }, []);

  

  const fetchAssiduidade = async () => {
    const res = await fetch('https://backend-django-2-7qpl.onrender.com/api/assiduidade/todos/');
    const data = await res.json();
    setAssiduidadeList(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEntrada = async () => {
    const acessToken=localStorage.getItem('access_token')
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://backend-django-2-7qpl.onrender.com/api/assiduidade/todos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcionario: formData.funcionario,
          entrada: formData.entrada,
          data: formData.data,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao registrar entrada');
      }

      await fetchAssiduidade();
      
      setOpen(false);
      setFormData({ funcionario: '', entrada: '', data: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaidaEdit = async (id: number, saida: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://backend-django-2-7qpl.onrender.com/api/assiduidade/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saida }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao registrar saída');
      }

      await fetchAssiduidade();
      setEditingId(null);
      setEditedSaida('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Assiduidade', 14, 16);
    autoTable(doc, {
      head: [['Funcionário', 'Entrada', 'Saída', 'Data', 'Duração']],
      body: assiduidadeList.map((a) => [
        a.funcionario_nome,
        a.entrada,
        a.saida || '-',
        a.data,
        a.duracao || '-',
      ]),
      startY: 20,
    });
    doc.save('relatorio-assiduidade.pdf');
  };

  // Funções para manipulação da câmera
  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Erro ao acessar a câmera: ' + (err as Error).message);
    }
  };

  const captureImage = (): string | null => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsRegisteringFace(false);
    setIsRegisteringExit(false);
  };

  const recognizeFace = async () => {
    const imageData = captureImage();
    if (!imageData) {
      setError('Falha ao capturar imagem');
      return;
    }

    try {
      const response = await fetch('https://8d3e-102-214-36-231.ngrok-free.app/api/facial/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await response.json();
      console.log(data)
      if (response.ok && data.funcionario_id) {
        const now = new Date();
        const hora = now.toTimeString().slice(0, 5); 
        const dataAtual = now.toISOString().split('T')[0]; // YYYY-MM-DD

        if (isRegisteringExit) {
          await registrarSaida(data.funcionario_id, hora);
        } else {
          setFormData({
            funcionario: data.funcionario_id.toString(),
            entrada: hora,
            data: dataAtual,
          });
        }

        closeCamera();
      } else {
        setError(data.error || 'Funcionário não reconhecido');
      }
    } catch (err) {
      setError('Erro no reconhecimento facial: ' + (err as Error).message);
    }
    const handleEntrada = async () => {
    const acessToken=localStorage.getItem('access_token')
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://backend-django-2-7qpl.onrender.com/api/assiduidade/todos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcionario: formData.funcionario,
          entrada: formData.entrada,
          data: formData.data,
        }),
      });

      if (!res.ok) {
       Swal.fire({
    icon: 'warning',
    title: 'Ops..',
    text: 'Verique o seu Servidor',
      })};
      if (res.ok){
        Swal.fire({
    icon: 'sucess',
    title: 'Registro feito',
    text: 'Tenha um ótimo Trabalho',
  });
      }
      await fetchAssiduidade();
      
      setOpen(false);
      setFormData({ funcionario: '', entrada: '', data: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  };

  const registrarSaida = async (funcionarioId: number, horaSaida: string) => {
    try {
      const registro = assiduidadeList.find(item => 
        item.funcionario.toString() === funcionarioId.toString() && 
        item.saida === null
      );

      if (registro) {
        await handleSaidaEdit(registro.id, horaSaida);
      } else {
        const now = new Date();
        const dataAtual = now.toISOString().split('T')[0];
        
        const res = await fetch('https://backend-django-2-7qpl.onrender.com/api/assiduidade/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            funcionario: funcionarioId,
            entrada: '00:00', // Entrada padrão
            saida: horaSaida,
            data: dataAtual,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Erro ao registrar saída');
        }

        await fetchAssiduidade();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Abrir câmera para registrar saída
  const openCameraSaida = async () => {
    setIsRegisteringExit(true);
    await openCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestão de Assiduidade</h1>
        <button onClick={exportToPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 min-h-[48px]">
          <FileText className="w-5 h-5" />
          Exportar PDF
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[48px] w-full sm:w-auto">
          <LogIn className="w-5 h-5" />
          Registrar Entrada
        </button>
        <button onClick={openCameraSaida} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-300 min-h-[48px] w-full sm:w-auto">
          <LogOut className="w-5 h-5" />
          Registrar Saída
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Nova Entrada</h2>

            <button
              onClick={openCamera}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
            >
              Reconhecimento Facial
            </button>

            {isCameraOpen && (
              <div className="space-y-2">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-auto border rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={recognizeFace}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                  >
                    Reconhecer
                  </button>
                  <button
                    onClick={closeCamera}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}


          </div>
        </div>
      )}

     
        </div>
      )}

      {/* Modal para registrar saída */}
      {isRegisteringExit && isCameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Registrar Saída</h2>
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-auto border rounded"
            />
            
            <div className="flex gap-2">
              <button
                onClick={recognizeFace}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
              >
                Reconhecer
              </button>
              <button
                onClick={closeCamera}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded"
              >
                Cancelar
              </button>
            </div>
            
          </div>
        </div>
      )}
      <div className="block sm:hidden space-y-4">
        {listaAssiduidade.map(item => (
          <div key={item.id} className="bg-white rounded shadow p-4 space-y-2">
            <p><strong>Funcionário:</strong> {item.funcionario_nome}</p>
            <p><strong>Entrada:</strong> {item.entrada}</p>
            <p><strong>Saída:</strong> {idEdicao === item.id ? (
              <input type="time" className="border px-2 py-1 rounded" value={editedSaida} onChange={(e) => setEditedSaida(e.target.value)}/>
            ) : (item.saida || '-')}</p>
            <p><strong>Data:</strong> {item.data}</p>
            <p><strong>Duração:</strong> {item.duracao || '-'}</p>
          </div>
        ))}
      </div>
      <div className="sm:block hidden overflow-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 px-10">
            <tr className=''>
              <th className="px-4 py-2">Funcionário</th>
              <th className="px-1 py-2">Entrada</th>
              <th className="px-4 py-2">Saída</th>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Duração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 ">
            {assiduidadeList.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 mx-24">
                <td className="px-10 py-2">{item.funcionario_nome}</td>
                <td className="px-15 py-2">{item.entrada}</td>
                <td className="px-10 py-2">
                  {editingId === item.id ? (
                    <input
                      type="time"
                      className="border px-2 py-1 rounded"
                      value={editedSaida}
                      onChange={(e) => setEditedSaida(e.target.value)}
                      placeholder="Digite o horário de saída"
                      title="Horário de saída"
                    />
                  ) : (
                    item.saida || '-'
                  )}
                </td>
                <td className="px-4 py-2">{item.data}</td>
                <td className="px-4 py-2">{item.duracao || '-'}</td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
