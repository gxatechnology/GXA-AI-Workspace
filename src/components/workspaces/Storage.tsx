import React from 'react';
import EnterprisePlatform from './EnterprisePlatform';
import { storedUser } from '../../utils/auth';
export default function Storage({ currentUser = storedUser() }: { currentUser?: any }) { return <EnterprisePlatform currentUser={currentUser} initialSection="billing" />; }
