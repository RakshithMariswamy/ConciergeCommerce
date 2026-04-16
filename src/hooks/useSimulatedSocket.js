import { useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';

const incomingTaskTemplates = [
  {
    type: 'Fitting Room',
    customer: 'James W.',
    customerId: null,
    item: 'Cashmere Sweater — Camel, Size L',
    sku: 'SWT-001',
    location: 'Fitting Room 4',
    urgency: 'high',
  },
  {
    type: 'Assistance',
    customer: 'New Customer',
    customerId: null,
    item: 'Womenswear — General Styling Assistance',
    sku: null,
    location: 'Womenswear Floor',
    urgency: 'normal',
  },
  {
    type: 'Click & Collect',
    customer: 'Emma Rodriguez',
    customerId: 'cust-004',
    item: 'Leather Belt — Cognac, Size 34',
    sku: 'BLT-001',
    location: 'Collection Desk',
    urgency: 'normal',
  },
  {
    type: 'Fitting Room',
    customer: 'David L.',
    customerId: null,
    item: 'Wool Trousers — Navy, Size 32',
    sku: 'TRS-001',
    location: 'Fitting Room 1',
    urgency: 'normal',
  },
  {
    type: 'Assistance',
    customer: 'New Customer',
    customerId: null,
    item: 'Accessories — Gift Wrapping Request',
    sku: null,
    location: 'Accessories Desk',
    urgency: 'normal',
  },
  {
    type: 'Fitting Room',
    customer: 'Michael Chen',
    customerId: 'cust-003',
    item: 'Linen Shirt — Pale Blue, Size L',
    sku: 'SHT-001',
    location: 'Fitting Room 3',
    urgency: 'normal',
  },
  {
    type: 'Click & Collect',
    customer: 'Sarah Kim',
    customerId: 'cust-002',
    item: 'Leather Handbag — Black',
    sku: 'HBG-001',
    location: 'Collection Desk',
    urgency: 'high',
  },
];

let taskCounter = 200;
let taskIndex = 0;

export const useSimulatedSocket = () => {
  const addTask = useAppStore((state) => state.addTask);
  const addNotification = useAppStore((state) => state.addNotification);
  const started = useRef(false);

  useEffect(() => {
    // Prevent double registration in StrictMode
    if (started.current) return;
    started.current = true;

    const interval = setInterval(() => {
      // ~55% probability each tick to simulate variable traffic
      if (Math.random() > 0.45) {
        const template = incomingTaskTemplates[taskIndex % incomingTaskTemplates.length];
        taskIndex++;

        const newTask = {
          id: taskCounter++,
          ...template,
          status: 'Pending',
          receivedAt: new Date().toISOString(),
        };

        addTask(newTask);
        addNotification({
          type: 'new_task',
          taskType: newTask.type,
          message: `New ${newTask.type} — ${newTask.customer}`,
          detail: newTask.item,
          taskId: newTask.id,
        });
      }
    }, 14000); // New requests arrive every ~14 seconds

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
