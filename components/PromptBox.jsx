import React, { useState } from 'react'
import Image from 'next/image'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import axios from 'axios';
const PromptBox = ({setIsLoading,isLoading}) => {
    const [prompt,setPrompt]=useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = React.useRef(null);
   
    const {user,chats,setChats,selectedChat,setSelectedChat,createNewChat,fetchUsersChats}=useAppContext();
    
    const handleKeyDown=(e)=>{
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            sendPrompt(e);
        }
    }
    
    const handleFileUpload=(e)=>{
        const files=e.target.files;
        if(files && files.length>0){
            const newFiles = Array.from(files).map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                file: file
            }));
            setSelectedFiles([...selectedFiles, ...newFiles]);
            toast.success(`${files.length} file(s) added`);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    }
    
    const removeFile = (index) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updatedFiles);
    }
    
    const getFileIcon = (type) => {
        if(type.startsWith('image/')) return '🖼️';
        if(type === 'application/pdf') return '📄';
        if(type.includes('word')) return '📝';
        if(type === 'text/plain') return '📋';
        return '📎';
    }
    
    const handlePinClick=()=>{
        if(fileInputRef.current){
            fileInputRef.current.click();
        }
    }
    const sendPrompt=async(e)=>{
        const promptCopy=prompt;
        try{
            e.preventDefault();
            if(!user) return toast.error('Login to send message');
            if(isLoading) return toast.error('Wait for previous prompt response');
            let activeChat = selectedChat || chats.find((chat)=>chat?._id);
            if(!activeChat?._id){
                activeChat = await createNewChat();
            }
            if(!activeChat?._id){
                const latestChats = await fetchUsersChats();
                activeChat = latestChats?.[0] || null;
            }
            if(!activeChat?._id) return toast.error('Unable to initialize chat. Please refresh and try again.');
            if(!selectedChat?._id) setSelectedChat(activeChat);
            setIsLoading(true)
            setPrompt("")
            setSelectedFiles([])

            const userPrompt={
                role:"user",
                content:prompt,
                timestamp:Date.now(),
            }
            //saving user prompt in chats array
            setChats((prevChats)=>prevChats.map((chat)=>chat._id===activeChat._id?{
                ...chat,
                messages:[...(chat.messages || []),userPrompt]
            }:chat))

            //saving user prompt in selected chat
            setSelectedChat((prev)=>{
                const baseChat = prev && prev._id === activeChat._id ? prev : activeChat;
                return {
                    ...baseChat,
                    messages:[...(baseChat.messages || []),userPrompt]
                }
            })

            // Convert files to base64
            const filesData = [];
            for(const fileObj of selectedFiles){
                const fileData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        resolve({
                            name: fileObj.name,
                            type: fileObj.type,
                            size: fileObj.size,
                            data: e.target.result
                        });
                    };
                    reader.readAsDataURL(fileObj.file);
                });
                filesData.push(fileData);
            }
            
            const {data}=await axios.post('/api/chat/ai',{
                chatId:activeChat._id,
                prompt,
                files: filesData
            })
            if(data.success){
                console.log('AI response:', data.data);
                setChats((prevChats)=>prevChats.map((chat)=>chat._id=== activeChat._id?{...chat,messages:[...(chat.messages || []),data.data]}:chat))
                const message=data.data.content;
                const messageTokens=message.split(" ");
                let assistantMessage={
                    role:'assistant',
                    content:"",
                    timestamp:Date.now(),

                }
                setSelectedChat((prev)=>{
                    const baseChat = prev && prev._id === activeChat._id ? prev : activeChat;
                    return {
                        ...baseChat,
                        messages:[...(baseChat.messages || []),assistantMessage]
                    }
                })

                for(let i=0;i<messageTokens.length;i++){
                    setTimeout(()=>{
                        assistantMessage.content=messageTokens.slice(0,i + 1).join(" ");
                        setSelectedChat((prev)=>{
                            if(!prev) return prev;
                            const updatedMessages=[
                                ...(prev.messages || []).slice(0,-1),
                                assistantMessage
                            ]
                            return {...prev,messages:updatedMessages}
                        })
                    },i* 100)
                }

            }else{
                toast.error(data.message)
                setPrompt(promptCopy);
            }
        }catch(error){
            toast.error(error?.response?.data?.message || error.message || 'Something went wrong')
            setPrompt(promptCopy);
        }finally{
            setIsLoading(false);
        }
    }
  return (
    <form  onSubmit={sendPrompt}
    className={`w-full ${selectedChat?.messages?.length>0 ?"max-w-3xl":"max-w-2xl"} bg-[#404045] p-4 rounded-3xl mt-4 transition-all`}>
        {selectedFiles.length > 0 && (
            <div className='mb-3 flex flex-wrap gap-2'>
                {selectedFiles.map((file, index) => (
                    <div key={index} className='flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg text-xs text-white'>
                        <span>{getFileIcon(file.type)}</span>
                        <span className='truncate max-w-32'>{file.name}</span>
                        <button
                            type='button'
                            onClick={() => removeFile(index)}
                            className='ml-1 hover:bg-gray-600 rounded px-1 py-0.5'
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        )}
        <textarea onKeyDown={handleKeyDown}
        className='outline-none w-full resize-none overflow-hidden wrap-break-word bg-transparent' rows={2} placeholder='Message DeepSeek' required
        onChange={(e)=>setPrompt(e.target.value)} value={prompt}/>

        <div className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-2'>
                <p className='flex items-center gap-2 text-xs border border-gray-300-/40 px-2
                py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition'>
                    <Image src={assets.deepthink_icon} alt='' className='h-5'/>
                    DeepThink (R1)
                </p>
                <p className='flex items-center gap-2 text-xs border border-gray-300-/40 px-2
                py-1 rounded-full cursor-pointer hover:bg-gray-500/20 transition'>
                    <Image src={assets.search_icon} alt='' className='h-5'/>
                   Search
                </p>
            </div>

            <div className='flex items-center gap-2'>
                <div onClick={handlePinClick} className='cursor-pointer hover:opacity-70 transition'>
                    <Image src={assets.pin_icon} alt='Upload files' className='w-4 cursor-pointer'/>
                </div>
                <input 
                    ref={fileInputRef}
                    type='file'
                    multiple
                    accept='image/*,.pdf,.doc,.docx,.txt'
                    onChange={handleFileUpload}
                    className='hidden'
                />
                <button disabled={!prompt && selectedFiles.length === 0} className={`${(prompt || selectedFiles.length > 0)?'bg-primary':'bg-[#71717a]'} rounded-full p-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Image src={(prompt || selectedFiles.length > 0)?assets.arrow_icon:assets.arrow_icon_dull} alt='' className='w-3.5 h-auto aspect-square'/>
                </button>
            </div>

        </div>

    </form>
  )
}

export default PromptBox
