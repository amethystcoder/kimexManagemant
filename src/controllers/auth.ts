import { readFileSync,writeFileSync } from 'fs';
import { Request, Response } from 'express';
import { user, loginRequest, userType } from '../types/authTypes';
import path from 'path';
const bcrypt = require('bcrypt');

const usersFile = path.join(__dirname,'../model/users.plex');

export const loginUser = (req:any, res:any) => {
    //read user data from a plex file
    let users:user[] = [];
    try {
        const data = readFileSync(usersFile, 'utf8').trim();
        if (data === '') return res.status(404).json({ success:false,message: 'No users found' });
        const parsedData = Buffer.from(data, 'base64').toString('utf8'); // Decode base64
        users = JSON.parse(parsedData);
        const user = users.find(user => user.username === req.body.username);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check password
        const isPasswordValid = bcrypt.compareSync(req.body.password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });
        // If password is valid, return user data (excluding password)
        const { password, ...userData } = user; // Exclude password from response
        res.status(200).json({...userData,success:true, message: 'Login successful' });
    } catch (err) {
        console.error('Error reading users file:', err);
    }
}

export const registerUser = (req:any, res:any) => {
    //read user data from a plex file
    let users:user[] = [];
    
    try {
        const data = readFileSync(usersFile, 'utf8').trim();
        if (data === '') {
            users = [];
        }
        else {
            const parsedData = Buffer.from(data, 'base64').toString('utf8'); 
            users = JSON.parse(parsedData);
        } 
    } catch (err) {
        console.error('Error reading users file:', err);
    }

    const newUser:user = req.body;
    if (!newUser.username || !newUser.password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = users.find(user => user.username === newUser.username);
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const saltRounds = 10;
    newUser.password = bcrypt.hashSync(newUser.password, saltRounds);

    users.push(newUser);

    try {
        writeFileSync(
            usersFile, 
            Buffer.from(
                JSON.stringify(users, null, 2), 'utf8').toString('base64')
                ) 
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Error writing to users file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const logoutUser = (req:any, res:any) => {}

export const getUserProfile = (req:any, res:any) => {
    //read user data from a plex file
    try {
        const data = readFileSync(usersFile, 'utf8').trim();
        if (data === '') {
            return res.status(404).json({ message: 'No users found' });
        }
        const parsedData = Buffer.from(data, 'base64').toString('utf8'); 
        const users:user[] = JSON.parse(parsedData);
        
        const userId = req.query.id as string;
        const userProfile = users.find(user => user.id === userId);
        
        if (!userProfile) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json(userProfile);
    } catch (err) {
        console.error('Error reading users file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const updateUserProfile = (req:any, res:any) => {
    //read user data from a plex file
    try {
        const data = readFileSync(usersFile, 'utf8').trim();
        if (data === '') {
            return res.status(404).json({ message: 'No users found' });
        }
        const parsedData = Buffer.from(data, 'base64').toString('utf8'); // Decode base64
        let users:user[] = JSON.parse(parsedData);
        
        const userId = req.query.id as string;
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const updatedUser = { ...users[userIndex], ...req.body };
        users[userIndex] = updatedUser;
        
        
        writeFileSync(
            usersFile, 
            Buffer.from(JSON.stringify(users, null, 2), 'utf8').toString('base64')
            ); // Encode to base64
        
        res.status(200).json({ message: 'User profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error('Error reading or writing users file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const deleteUserAccount = (req:any, res:any) => {
    //read user data from a plex file
    try {
        const data = readFileSync(usersFile, 'utf8').trim();
        if (data === '') {
            return res.status(404).json({ message: 'No users found' });
        }
        const parsedData = Buffer.from(data, 'base64').toString('utf8'); // Decode base64
        let users:user[] = JSON.parse(parsedData);
        
        const userId = req.query.id as string;
        users = users.filter(user => user.id !== userId);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        writeFileSync(
            usersFile, 
            Buffer.from(JSON.stringify(users, null, 2), 'utf8').toString('base64')
            );
        
        res.status(200).json({ message: 'User account deleted successfully' });
    } catch (err) {
        console.error('Error reading or writing users file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const changeUserPassword = (req:any, res:any) => {
    //read user data from a plex file
    try {
        const data = readFileSync(usersFile, 'utf8').trim();
        if (data === '') {
            return res.status(404).json({ message: 'No users found' });
        }
        const parsedData = Buffer.from(data, 'base64').toString('utf8'); // Decode base64
        let users:user[] = JSON.parse(parsedData);
        
        const userId = req.query.id as string;
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User with id and password not found' });
        }
        
        const saltRounds = 10;
        const newPassword = bcrypt.hashSync(req.body.password, saltRounds);
        

        users[userIndex].password = newPassword;
        
        writeFileSync(
            usersFile, 
            Buffer.from(JSON.stringify(users, null, 2), 'utf8').toString('base64')
            ); 
        
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Error reading or writing users file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {
    loginUser,
    registerUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    deleteUserAccount,
    changeUserPassword
};