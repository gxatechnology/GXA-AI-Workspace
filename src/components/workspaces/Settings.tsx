import React from 'react';
import EnterprisePlatform from './EnterprisePlatform';
import { storedUser } from '../../utils/auth';
export default function Settings({ currentUser = storedUser() }: { currentUser?: any }) { return <EnterprisePlatform currentUser={currentUser} initialSection="security" />; }
