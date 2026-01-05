#!/usr/bin/env node
/**
 * Cron job script to process recurring tasks
 * Runs daily to check for completed recurring tasks and create new instances
 * 
 * Usage: node scripts/process-recurring-tasks.js
 * Or via systemd timer
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function calculateNextDueDate(currentDueAt, rule, interval) {
  const next = new Date(currentDueAt);
  
  switch (rule) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }
  
  return next;
}

async function processRecurringTasks() {
  console.log(`[${new Date().toISOString()}] Starting recurring task processing...`);
  
  try {
    // Find all completed tasks that have recurrence rules
    const completedRecurringTasks = await prisma.task.findMany({
      where: {
        status: 'DONE',
        recurrenceRule: { not: null },
        nextDueAt: { not: null },
      },
      include: {
        subtasks: true,
      },
    });

    console.log(`Found ${completedRecurringTasks.length} completed recurring tasks to process`);

    let created = 0;
    let errors = 0;

    for (const task of completedRecurringTasks) {
      try {
        const rule = task.recurrenceRule;
        const interval = task.recurrenceInterval || 1;
        const currentDueAt = task.nextDueAt || task.dueAt || new Date();
        
        // Calculate next due date
        const newDueAt = calculateNextDueDate(currentDueAt, rule, interval);
        const newNextDueAt = calculateNextDueDate(newDueAt, rule, interval);

        // Create new task instance
        const newTask = await prisma.task.create({
          data: {
            title: task.title,
            notes: task.notes,
            priority: task.priority,
            status: 'TODO',
            listId: task.listId,
            ownerId: task.ownerId,
            dueAt: newDueAt,
            recurrenceRule: task.recurrenceRule,
            recurrenceInterval: task.recurrenceInterval,
            nextDueAt: newNextDueAt,
          },
        });

        // Copy subtasks if any (reset to incomplete)
        if (task.subtasks.length > 0) {
          await prisma.subtask.createMany({
            data: task.subtasks.map((subtask, index) => ({
              taskId: newTask.id,
              title: subtask.title,
              completed: false,
              order: index,
            })),
          });
        }

        // Clear recurrence from the completed task so it's not processed again
        await prisma.task.update({
          where: { id: task.id },
          data: {
            recurrenceRule: null,
            nextDueAt: null,
          },
        });

        console.log(`Created new recurring task: "${task.title}" due ${newDueAt.toISOString()}`);
        created++;
      } catch (err) {
        console.error(`Error processing task ${task.id}:`, err);
        errors++;
      }
    }

    console.log(`[${new Date().toISOString()}] Completed: ${created} tasks created, ${errors} errors`);
  } catch (error) {
    console.error('Fatal error in recurring task processing:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
processRecurringTasks();

