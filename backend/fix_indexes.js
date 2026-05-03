import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// We want to add @@index([organizationId]) to any model that has an organizationId field
// and doesn't already have an @@index([organizationId])

const models = schema.split(/^model\s+/m);
let newSchema = models[0];

for (let i = 1; i < models.length; i++) {
  let modelStr = models[i];
  
  // Check if it has organizationId
  if (modelStr.includes('organizationId String') || modelStr.includes('organizationId  String')) {
    // Check if it already has the index
    if (!modelStr.includes('@@index([organizationId])')) {
      // Find the last closing brace
      const lastBraceIndex = modelStr.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        modelStr = modelStr.substring(0, lastBraceIndex) + '  @@index([organizationId])\n' + modelStr.substring(lastBraceIndex);
      }
    }
  }
  
  // same for clientId
  if (modelStr.includes('clientId String') || modelStr.includes('clientId  String') || modelStr.includes('clientId       String')) {
    if (!modelStr.includes('@@index([clientId])')) {
      const lastBraceIndex = modelStr.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        modelStr = modelStr.substring(0, lastBraceIndex) + '  @@index([clientId])\n' + modelStr.substring(lastBraceIndex);
      }
    }
  }

  // same for assignedToId
  if (modelStr.includes('assignedToId String') || modelStr.includes('assignedToId  String') || modelStr.includes('assignedToId   String?')) {
    if (!modelStr.includes('@@index([assignedToId])')) {
      const lastBraceIndex = modelStr.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        modelStr = modelStr.substring(0, lastBraceIndex) + '  @@index([assignedToId])\n' + modelStr.substring(lastBraceIndex);
      }
    }
  }

  newSchema += 'model ' + modelStr;
}

fs.writeFileSync(schemaPath, newSchema);
console.log('Schema updated successfully with indexes.');
