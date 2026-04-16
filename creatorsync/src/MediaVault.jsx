import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; 
import { UploadCloud, Copy, Check, FileVideo, Dumbbell, Code, MonitorPlay, Trash2, Download } from 'lucide-react';

const CLOUD_NAME = "dsf2qfu5g";  
const UPLOAD_PRESET = "my_react_app"; 

const MediaVault = ({ user }) => {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('Vlog');
  const [uploadProgress, setUploadProgress] = useState({});
  const [mediaItems, setMediaItems] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "mediaVault"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => {
        const aTime = a.timestamp?.seconds ?? a.timestamp?.toDate?.()?.getTime?.() ?? 0;
        const bTime = b.timestamp?.seconds ?? b.timestamp?.toDate?.()?.getTime?.() ?? 0;
        return bTime - aTime;
      });
      setMediaItems(items);
      setLoadError('');
    }, (error) => {
      console.error('Media Vault listener failed:', error);
      setLoadError('We could not load your vault. Please check Firestore rules and authentication.');
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;

    Array.from(files).forEach((file) => {
      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true); 
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            const downloadURL = response.secure_url;

            await addDoc(collection(db, "mediaVault"), {
              name: file.name,
              url: downloadURL,
              size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
              category: category,
              timestamp: serverTimestamp(),
              userId: user.uid
            });

            setUploadProgress(prev => {
              const newProg = { ...prev };
              delete newProg[file.name];
              return newProg;
            });
            setFiles([]);
          } catch (error) {
            console.error("Firestore save failed", error);
            setLoadError('Upload finished, but Firestore blocked the save. Check your live rules and userId field.');
          }
        } else {
          console.error("Upload failed", xhr.responseText);
          alert("Upload failed. Please check your Cloudinary Preset name.");
        }
      };

      xhr.send(formData);
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this video from your vault?")) {
      await deleteDoc(doc(db, "mediaVault", id));
    }
  };

  const copyToClipboard = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDownloadUrl = (url, fileName) => {
    if (!url) return '';

    const safeFileName = encodeURIComponent(fileName || 'download');
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/fl_attachment:${safeFileName}/`);
    }

    return url;
  };

  const handleDownload = async (url, fileName) => {
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.warn('Blob download failed, opening Cloudinary attachment URL instead.', error);
      const fallbackUrl = getDownloadUrl(url, fileName);
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'Engineering': return <Code size={16} className="text-[#ffc01e]" />;
      case 'Gym': return <Dumbbell size={16} className="text-[#f97316]" />;
      default: return <MonitorPlay size={16} className="text-[#ffc01e]" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-2">
      <header className="mb-10">
        <h2 className="text-4xl font-light text-white tracking-wide">Media Vault</h2>
        <p className="text-gray-400 mt-2 font-light">Secure, real-time footage bridge. Drop your raw files here.</p>
      </header>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-12 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          
          <div className="flex-1 w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-2xl cursor-pointer hover:bg-white/5 hover:border-[#f97316] transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-400"><span className="font-semibold text-white">Click to select</span> or drag MP4/MOV files</p>
              </div>
              <input type="file" multiple accept="video/*" className="hidden" onChange={(e) => setFiles(e.target.files)} />
            </label>
          </div>

          <div className="flex flex-col gap-4 w-full md:w-64">
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#111318]/70 border border-gray-600 text-white text-sm rounded-xl block w-full p-3 outline-none focus:border-[#f97316] transition-colors"
            >
              <option value="Vlog">Vlog & B-Roll</option>
              <option value="Gym">Gym / Form Check</option>
              <option value="Engineering">Engineering / Setup</option>
            </select>
            
            <button 
              onClick={handleUpload}
              disabled={files.length === 0}
              className="bg-[#ffc01e] text-[#111318] hover:bg-[#ffcf54] disabled:bg-gray-700 disabled:text-gray-500 font-medium rounded-xl text-sm px-5 py-3 text-center transition-all w-full"
            >
              Upload {files.length > 0 ? `${files.length} File(s)` : ''}
            </button>
          </div>
        </div>

        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-6 space-y-3">
            {Object.entries(uploadProgress).map(([fileName, prog]) => (
              <div key={fileName} className="bg-[#111318]/70 rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span className="truncate w-3/4">{fileName}</span>
                  <span>{prog}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-[#f97316] h-1.5 rounded-full transition-all duration-300" style={{ width: `${prog}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="text-xl font-medium text-white mb-6">Recent Footage</h3>
      {loadError && (
        <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {mediaItems.map((item) => (
          <div key={item.id} className="group bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 relative">
            <button 
              onClick={() => handleDelete(item.id)}
              className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-30"
              title="Delete Video"
            >
              <Trash2 size={16} />
            </button>

            <div className="aspect-video bg-gray-900 rounded-xl mb-4 flex items-center justify-center border border-gray-800 overflow-hidden relative group cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
               <FileVideo className="text-gray-600 w-12 h-12 group-hover:scale-110 transition-transform duration-500 z-10" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                  <span className="text-xs font-semibold text-white tracking-widest uppercase">Play</span>
               </div>
            </div>
            
            <div className="flex items-start justify-between">
              <div className="overflow-hidden">
                <p className="text-white text-sm font-medium truncate w-40" title={item.name}>{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getCategoryIcon(item.category)}
                  <p className="text-xs text-gray-400">{item.size}</p>
                </div>
              </div>
              
              <button 
                onClick={() => copyToClipboard(item.url, item.id)}
                className="bg-gray-700/50 hover:bg-gray-600 p-2 rounded-lg text-gray-300 transition-colors"
                title="Copy Video URL"
              >
                {copiedId === item.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>

              <button
                onClick={() => handleDownload(item.url, item.name)}
              className="bg-[#f97316]/80 hover:bg-[#f97316] p-2 rounded-lg text-white transition-colors ml-2"
                title="Download Video"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        ))}
        
        {mediaItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 font-light border border-dashed border-gray-700/50 rounded-2xl">
            Vault is empty. Waiting for raw drops...
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaVault;
