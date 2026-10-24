const Resume = require('../models/resume.model');
const { validateResumeFile } = require('../utils/fileValidation');

/**
 * Get all resume versions for the authenticated user, sorted newest first.
 */
const getResumeList = async (req, res) => {
    try {
        const user = req.user;
        const resumes = await Resume.find({ user: user._id })
            .sort({ version: -1, createdAt: -1 })
            .select('-fileData');

        res.status(200).json({
            success: true,
            message: 'Resumes fetched successfully',
            data: resumes
        });
    } catch (error) {
        console.error('[Resume getResumeList Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

/**
 * Get the current active resume for the authenticated user.
 */
const getCurrentResume = async (req, res) => {
    try {
        const user = req.user;
        let resume = await Resume.findOne({ user: user._id, isCurrent: true }).select('-fileData');
        
        if (!resume) {
            resume = await Resume.findOne({ user: user._id })
                .sort({ version: -1, createdAt: -1 })
                .select('-fileData');
        }

        if (!resume) {
            return res.status(404).json({ success: false, message: 'No resume found' });
        }

        res.status(200).json({
            success: true,
            data: resume
        });
    } catch (error) {
        console.error('[Resume getCurrentResume Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

/**
 * Get single resume details by ID.
 */
const getResumeById = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user._id }).select('-fileData');

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        res.status(200).json({
            success: true,
            data: resume
        });
    } catch (error) {
        console.error('[Resume getResumeById Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

/**
 * Download the original stored resume file securely.
 */
const downloadResumeFile = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user._id });

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        res.setHeader('X-Content-Type-Options', 'nosniff');

        if (resume.fileData && resume.fileData.length > 0) {
            const fileName = resume.originalFileName || `resume_v${resume.version || 1}.pdf`;
            res.setHeader('Content-Type', resume.fileContentType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Length', resume.fileData.length);
            return res.send(resume.fileData);
        }

        // Fallback for legacy text-only resumes
        if (resume.resumeText) {
            const fileName = resume.originalFileName || `resume_v${resume.version || 1}.txt`;
            const textBuffer = Buffer.from(resume.resumeText, 'utf8');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Length', textBuffer.length);
            return res.send(textBuffer);
        }

        return res.status(404).json({ success: false, message: 'Original file content is not available for this record.' });
    } catch (error) {
        console.error('[Resume downloadResumeFile Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

/**
 * Upload a new resume version.
 * Creates a brand new record without overwriting previous versions.
 */
const uploadResume = async (req, res) => {
    try {
        const user = req.user;
        const { 
            originalFileName, 
            fileData, 
            resumeText: clientResumeText, 
            note, 
            targetCompany, 
            targetRole 
        } = req.body || {};

        if (!originalFileName || typeof originalFileName !== 'string' || !originalFileName.trim()) {
            return res.status(400).json({ success: false, message: 'Original file name is required' });
        }

        if (!fileData) {
            return res.status(400).json({ success: false, message: 'File data is required' });
        }

        // Validate decoded Buffer size, encoding, and format signatures
        const fileValidation = validateResumeFile(fileData, originalFileName);
        if (!fileValidation.valid) {
            return res.status(400).json({
                success: false,
                message: fileValidation.error
            });
        }

        const buffer = fileValidation.buffer;
        const validatedContentType = fileValidation.contentType;
        const ext = fileValidation.extension;

        let extractedText = (clientResumeText || '').trim();
        if (!extractedText && buffer) {
            if (ext === '.pdf') {
                try {
                    const pdfParse = require('pdf-parse');
                    const pdfResult = await pdfParse(buffer, { max: 15 });
                    extractedText = (pdfResult.text || '').trim();
                } catch (pdfErr) {
                    console.error('[PDF Extraction Notice]:', pdfErr.message);
                }
            } else if (ext === '.txt') {
                extractedText = buffer.toString('utf8').trim();
            }
        }

        if (!extractedText) {
            extractedText = `Resume: ${originalFileName}\nUploaded: ${new Date().toLocaleDateString()}\nNote: ${note || 'No description provided'}`;
        }

        // Determine user-scoped version number
        const latestResume = await Resume.findOne({ user: user._id }).sort({ version: -1 });
        const nextVersion = latestResume && typeof latestResume.version === 'number' ? latestResume.version + 1 : 1;

        // Unset any previous current resume only AFTER validation has passed
        await Resume.updateMany({ user: user._id }, { $set: { isCurrent: false } });

        const newResume = await Resume.create({
            user: user._id,
            version: nextVersion,
            isCurrent: true,
            originalFileName: originalFileName.trim(),
            resumeText: extractedText,
            note: (note || '').trim(),
            targetCompany: (targetCompany || '').trim(),
            targetRole: (targetRole || '').trim(),
            fileData: buffer,
            fileContentType: validatedContentType,
            fileSize: buffer.length,
            processingStatus: 'completed'
        });

        const result = newResume.toObject();
        delete result.fileData;

        res.status(201).json({
            success: true,
            message: 'Resume uploaded successfully',
            data: result
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A resume version conflict occurred due to concurrent uploads. Please retry.'
            });
        }
        console.error('[Resume uploadResume Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

/**
 * Set a specific resume as the current active version.
 */
const setCurrentResume = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user._id });

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        await Resume.updateMany({ user: req.user._id }, { $set: { isCurrent: false } });
        resume.isCurrent = true;
        await resume.save();

        const result = resume.toObject();
        delete result.fileData;

        res.status(200).json({
            success: true,
            message: `Version v${resume.version} is now your active resume`,
            data: result
        });
    } catch (error) {
        console.error('[Resume setCurrentResume Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

/**
 * Update a resume's note or target company/role.
 */
const updateResumeNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note, targetCompany, targetRole } = req.body || {};
        const resume = await Resume.findOne({ _id: id, user: req.user._id });

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        if (note !== undefined) resume.note = typeof note === 'string' ? note.trim() : '';
        if (targetCompany !== undefined) resume.targetCompany = typeof targetCompany === 'string' ? targetCompany.trim() : '';
        if (targetRole !== undefined) resume.targetRole = typeof targetRole === 'string' ? targetRole.trim() : '';

        await resume.save();

        const result = resume.toObject();
        delete result.fileData;

        res.status(200).json({
            success: true,
            message: 'Resume note updated successfully',
            data: result
        });
    } catch (error) {
        console.error('[Resume updateResumeNote Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

/**
 * Delete a resume version.
 * If the deleted version was current, automatically promotes the next newest.
 */
const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user._id });

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        const wasCurrent = resume.isCurrent;
        await resume.deleteOne();

        // If the deleted resume was current, make the newest remaining resume current
        if (wasCurrent) {
            const nextActive = await Resume.findOne({ user: req.user._id }).sort({ version: -1, createdAt: -1 });
            if (nextActive) {
                nextActive.isCurrent = true;
                await nextActive.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Resume version deleted successfully'
        });
    } catch (error) {
        console.error('[Resume deleteResume Error]:', error.message);
        res.status(500).json({ success: false, message: 'An unexpected internal error occurred' });
    }
};

module.exports = {
    getResumeList,
    getCurrentResume,
    getResumeById,
    downloadResumeFile,
    uploadResume,
    setCurrentResume,
    updateResumeNote,
    deleteResume
};

