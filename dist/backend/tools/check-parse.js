const fs = require('fs');
const path = require('path');
const { parseGrades, flattenGrades } = require('../parser');

const file = process.argv[2];

if (!file) {
    console.error('Usage: npm run check-parse -- <saved-gradebook.html>');
    console.error('Save the page at https://schoology.harker.org/grades/grades with Cmd-S first.');
    process.exit(1);
}

if (!fs.existsSync(file)) {
    console.error(`No such file: ${path.resolve(file)}`);
    process.exit(1);
}

const html = fs.readFileSync(file, 'utf8');
const courses = parseGrades(html, []);

if (courses.length === 0) {
    console.log('Parsed 0 courses.');
    console.log('That usually means the saved page is a login page rather than the gradebook.');
    process.exit(1);
}

console.log(`Courses found: ${courses.length}\n`);

let totalAssignments = 0;
const duplicateKeyWarnings = [];

courses.forEach((course, i) => {
    const periodCount = course.gradingPeriods.length;
    console.log(`Course ${i + 1}: ${periodCount} grading period(s), overall grade ${course.overallGrade ? 'present' : 'MISSING'}`);

    course.gradingPeriods.forEach(period => {
        const catCount = period.categories.length;
        const assignmentCount = period.categories.reduce((n, c) => n + c.assignments.length, 0);
        totalAssignments += assignmentCount;
        console.log(`  period "${period.periodName}": ${catCount} categor(ies), ${assignmentCount} assignment(s)`);

        period.categories.forEach(cat => {
            console.log(`    - "${cat.name}" (weight ${cat.weight || 'n/a'}): ${cat.assignments.length} assignment(s)`);
        });

        if (catCount === 0) {
            duplicateKeyWarnings.push(`period "${period.periodName}" in course ${i + 1} has no categories`);
        }
    });
    console.log('');
});

const flat = flattenGrades(courses);
const flatCount = Object.keys(flat).length;

console.log(`Assignments parsed: ${totalAssignments}`);
console.log(`Unique tracking keys: ${flatCount}`);

if (flatCount !== totalAssignments) {
    console.log(`\nWARNING: ${totalAssignments - flatCount} assignment(s) collide onto a shared key.`);
    console.log('Those grades would not notify. Please report this.');
} else {
    console.log('\nOK: every assignment has a unique tracking key.');
}

duplicateKeyWarnings.forEach(w => console.log(`WARNING: ${w}`));
