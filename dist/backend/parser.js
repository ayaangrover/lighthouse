require('./polyfill');

const cheerio = require('cheerio');

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function parseGrades(html, ignoreCourses = []) {
    const $ = cheerio.load(html);
    const results = [];

    const courseContainers = $('.gradebook-course');

    courseContainers.each((_, container) => {
        const titleRaw = norm($(container).find('.gradebook-course-title').text());
        const courseName = titleRaw.split(':')[0].replace('Course', '').trim();

        let overallGrade = norm($(container).find('.course-grade-value').text());
        if (overallGrade === 'N/A' || overallGrade === '—') {
            const headerGradeMatch = titleRaw.match(/\(([^)]+)\)/);
            if (headerGradeMatch) overallGrade = headerGradeMatch[1];
        }

        const courseObj = { courseName, overallGrade, gradingPeriods: [] };

        $(container).find('tr.report-row').each((_, row) => {
            const $row = $(row);

            if ($row.hasClass('period-row')) {
                const pName = norm($row.find('.title').text()).replace(/Grading Period$/, '').trim();
                if (pName.toLowerCase().includes('(no grading period)')) return;

                courseObj.gradingPeriods.push({ periodName: pName, categories: [] });
            }
            else if ($row.hasClass('category-row')) {
                const catName = norm($row.find('.title').text()).replace(/Category$/, '').trim();

                const currentPeriod = courseObj.gradingPeriods[courseObj.gradingPeriods.length - 1];
                if (!currentPeriod) return;

                if (currentPeriod.categories.some(c => c.name === catName)) return;

                const catGrade = norm($row.find('.grade-column').text());

                currentPeriod.categories.push({
                    name: catName,
                    weight: norm($row.find('.percentage-contrib').text()),
                    grade: catGrade === '—' ? 'No Grade' : catGrade,
                    assignments: []
                });
            }
            else if ($row.hasClass('item-row')) {
                const currentPeriod = courseObj.gradingPeriods[courseObj.gradingPeriods.length - 1];
                if (!currentPeriod || currentPeriod.categories.length === 0) return;

                const currentCategory = currentPeriod.categories[currentPeriod.categories.length - 1];
                const score = norm($row.find('.awarded-grade').text());

                if (score !== '—' || $row.find('.submission-icon').length > 0) {
                    currentCategory.assignments.push({
                        name: norm($row.find('.title').text()).replace(/assignment$/, '').trim(),
                        score: score === '—' ? 'Ungraded Submission' : score,
                        maxPoints: norm($row.find('.max-grade').text()).replace('/ ', ''),
                        date: norm($row.find('.due-date, .gradebook-due-date, .assignment-due-date').first().text())
                    });
                }
            }
        });

        const ignored = ignoreCourses.some(
            needle => courseName.toLowerCase().includes(String(needle).toLowerCase())
        );
        if (!ignored) results.push(courseObj);
    });

    return results;
}

function flattenGrades(courses) {
    const flat = {};
    courses.forEach(course => {
        course.gradingPeriods.forEach(period => {
            period.categories.forEach(cat => {
                cat.assignments.forEach(assignment => {
                    const key = `${course.courseName}::${period.periodName}::${cat.name}::${assignment.name}`;
                    flat[key] = {
                        courseName: course.courseName,
                        assignmentName: assignment.name,
                        score: assignment.score
                    };
                });
            });
        });
    });
    return flat;
}

module.exports = { parseGrades, flattenGrades };
