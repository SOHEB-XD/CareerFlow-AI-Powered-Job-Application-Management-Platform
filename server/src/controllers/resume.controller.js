const Resume = require('../models/resume.model');

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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
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

        if (resume.fileData && resume.fileData.length > 0) {
            const fileName = resume.originalFileName || `resume_v${resume.version || 1}.pdf`;
            res.setHeader('Content-Type', resume.fileContentType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            if (resume.fileSize) {
                res.setHeader('Content-Length', resume.fileSize);
            }
            return res.send(resume.fileData);
        }

        // Fallback for legacy text-only resumes
        if (resume.resumeText) {
            const fileName = resume.originalFileName || `resume_v${resume.version || 1}.txt`;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            return res.send(Buffer.from(resume.resumeText, 'utf8'));
        }

        return res.status(404).json({ success: false, message: 'Original file content is not available for this record.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
            fileContentType, 
            fileSize, 
            resumeText: clientResumeText, 
            note, 
            targetCompany, 
            targetRole 
        } = req.body;

        if (!originalFileName || !originalFileName.trim()) {
            return res.status(400).json({ success: false, message: 'Original file name is required' });
        }

        const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
        const ext = '.' + originalFileName.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported file format. Please upload one of: ${allowedExtensions.join(', ')}`
            });
        }

        const maxSizeBytes = 10 * 1024 * 1024; // 10MB
        if (fileSize && fileSize > maxSizeBytes) {
            return res.status(400).json({
                success: false,
                message: 'File size exceeds maximum allowable limit of 10MB.'
            });
        }

        let buffer = null;
        if (fileData) {
            try {
                const base64Content = fileData.includes(',') ? fileData.split(',')[1] : fileData;
                buffer = Buffer.from(base64Content, 'base64');
            } catch (err) {
                return res.status(400).json({ success: false, message: 'Invalid file data encoding' });
            }
        }

        let extractedText = (clientResumeText || '').trim();
        if (!extractedText && buffer) {
            if (ext === '.pdf') {
                try {
                    const pdfParse = require('pdf-parse');
                    const pdfResult = await pdfParse(buffer);
                    extractedText = (pdfResult.text || '').trim();
                } catch (pdfErr) {
                    console.error('PDF text extraction note:', pdfErr.message);
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

        // Unset any previous current resume
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
            fileContentType: fileContentType || (ext === '.pdf' ? 'application/pdf' : 'text/plain'),
            fileSize: fileSize || (buffer ? buffer.length : 0),
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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update a resume's note or target company/role.
 */
const updateResumeNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note, targetCompany, targetRole } = req.body;
        const resume = await Resume.findOne({ _id: id, user: req.user._id });

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        if (note !== undefined) resume.note = note.trim();
        if (targetCompany !== undefined) resume.targetCompany = targetCompany.trim();
        if (targetRole !== undefined) resume.targetRole = targetRole.trim();

        await resume.save();

        const result = resume.toObject();
        delete result.fileData;

        res.status(200).json({
            success: true,
            message: 'Resume note updated successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
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
