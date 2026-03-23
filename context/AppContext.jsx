"use client";

import { useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }) => {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();

    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);

    const createNewChat = async () => {
        try {
            if (!user) return null;

            const token = await getToken();

            const { data } = await axios.post(
                '/api/chat/create',
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (data.success && data.data) {
                setChats((prevChats) => [data.data, ...prevChats]);
                setSelectedChat(data.data);
                return data.data;
            }

            return null;
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
            return null;
        }
    };

    const fetchUsersChats = async () => {
        try {
            const token = await getToken();

            const { data } = await axios.get('/api/chat/get', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (data.success) {
                if (data.data.length === 0) {
                    const newChat = await createNewChat();
                    return newChat ? [newChat] : [];
                }

                const sortedChats = [...data.data].sort(
                    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                );

                setChats(sortedChats);
                setSelectedChat(sortedChats[0]);
                return sortedChats;
            } else {
                toast.error(data.message);
                return [];
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message);
            return [];
        }
    };

    useEffect(() => {
        if (isLoaded && user) {
            fetchUsersChats();
        }
    }, [isLoaded, user]);

    const value = {
        user,
        chats,
        setChats,
        selectedChat,
        setSelectedChat,
        fetchUsersChats,
        createNewChat
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};