import { Request, Response } from 'express';
import User from '../../models/users';

const saveUser = async (req: Request, res: Response) => {
    const { email, password, userType } = req.body;
    const newUser = new User({ email, password, userType });
    try {
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create user' });
    }
}

export default saveUser;