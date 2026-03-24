import React, { useState } from 'react'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'

const ChatLabel = ({openMenu,setOpenMenu,id,name}) => {
 const {fetchUsersChats,chats,setSelectedChat}=useAppContext()
 const [isMenuOpen, setIsMenuOpen] = useState(false)
 const selectChat=()=>{
  const chatData=chats.find(chat=>chat._id===id)
  setSelectedChat(chatData)
  console.log(chatData)
 }
 const renameHandler=async()=>{
  try{
    const newName=prompt("Enter new name")
    if(!newName) return
    const {data}=await axios.post('/api/chat/rename',{chatId:id,name:newName})
    if(data.success){
      fetchUsersChats()
      setOpenMenu({id:0,open:false})
      toast.success(data.message)
    }
    else{
      toast.error(data.message)
    }
  }catch(error){
    toast.error(error.message)

  }
 }

 const deleteHandler=async()=>{
  try{
    const confirm=window.confirm('Are you sure you want to delete this chat?')
    if(!confirm)return
    const {data}=await axios.post('/api/chat/delete',{chatId:id})
    if(data.success){
      fetchUsersChats()
      setOpenMenu({id:0,open:false})
      toast.success(data.message)
    }else
    {
      toast.error(data.message)
    }
  }catch(error){
    toast.error(error.message)

  }
 }


  return (
    <div onClick={selectChat} className='flex items-center justify-between p-2 text-white/80 hover:bg-white/10 rounded-lg text-sm group cursor-pointer relative'>
      <p className='group-hover:max-w-5/6 truncate'>{name}</p>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className='flex items-center justify-center h-6 w-6 aspect-square hover:bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity'
      >
        <Image src={assets.three_dots} className='w-4' alt='More options' />
      </button>
      {isMenuOpen && (
        <div onMouseLeave={() => setIsMenuOpen(false)} className='absolute -right-36 top-6 bg-gray-700 rounded-xl w-max p-2 z-20'>
          <button onClick={renameHandler} className='flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg w-full text-left'>
            <Image src={assets.pencil_icon} className='w-4' alt='Rename chat' />
            <p>Rename</p>
          </button>
          <button onClick={deleteHandler} className='flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg w-full text-left'>
            <Image src={assets.delete_icon} className='w-4' alt='Delete chat' />
            <p>Delete</p>
          </button>
        </div>
      )}
    </div>
  )
}

export default ChatLabel
