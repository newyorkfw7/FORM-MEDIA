const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const fs = require('fs');
const ExcelJS = require('exceljs'); // Importar la librería exceljs
const app = express();
const PORT = process.env.PORT || 3000;

const pdfDir = path.join(__dirname, 'pdf');
if (!fs.existsSync(pdfDir)){
    fs.mkdirSync(pdfDir);
}

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/save-pdf', (req, res) => {
  const { imgData, mediaId } = req.body;
  if (!imgData || !mediaId) {
      console.error('No se recibieron datos de imagen o ID de media');
      return res.status(400).json({ success: false, error: 'No se recibieron datos de imagen o ID de media' });
  }

  const base64Data = imgData.replace(/^data:image\/png;base64,/, "");
  
  const filename = `ticket_${mediaId}.pdf`;
  const filePath = path.join(pdfDir, filename);

  // Crear el PDF
  const pdf = new PDFDocument();
  const stream = fs.createWriteStream(filePath);

  pdf.pipe(stream);

  try {
      pdf.image(Buffer.from(base64Data, 'base64'), {
          fit: [500, 500],
          align: 'center',
          valign: 'center'
      });

      pdf.end();

      stream.on('finish', () => {
          console.log(`PDF guardado exitosamente: ${filename}`);
          res.json({ success: true, filename: filename });
      });

      stream.on('error', (err) => {
          console.error('Error al guardar el PDF:', err);
          res.status(500).json({ success: false, error: 'Error al guardar el PDF' });
      });
  } catch (error) {
      console.error('Error al procesar la imagen:', error);
      res.status(500).json({ success: false, error: 'Error al procesar la imagen' });
  }
});

// Middleware para manejar JSON y datos de formulario
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Carpeta donde se guardarán los archivos
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre del archivo
  }
});

// Middleware para manejar la carga de archivos
const upload = multer({ storage });

// Configura la opción strictQuery
mongoose.set('strictQuery', true); // O false, dependiendo de tu preferencia

// Conectarse a MongoDB
const mongoURI = 'mongodb://172.26.13.59/dbmedia';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Model schema
const modelSchema = new mongoose.Schema({
  participationNumber: { type: String, unique: true },
  fullName: String,
  emailAddress: String,
  phoneNumber: String,
  type: String,
  day: String,
  time: String,
  instagramUsername: String,
  status: { type: String, default: 'pending' },
  registerStatus: { type: String, default: 'No Register' } // Nuevo campo para el estado de registro
});

const Media = mongoose.model('Media', modelSchema);

// Endpoint para registrar un nuevo media
app.post('/register', upload.single('profilePicture'), async (req, res) => {
  const { fullName, emailAddress, phoneNumber, type, instagramUsername, day, time } = req.body;
  console.log('Datos recibidos:', { fullName, emailAddress, phoneNumber, type, instagramUsername, day, time });

  try {
    const participationNumber = await generateParticipationNumber();
    const newMedia = new Media({
      participationNumber,
      fullName,
      emailAddress,
      phoneNumber,
      type,
      instagramUsername,
      day,
      time
    });
    await newMedia.save();
    res.status(201).json({ message: 'Media registered successfully', participationNumber });
  } catch (err) {
    console.error('Error registering media:', err);
    res.status(500).json({ error: 'An error occurred while registering the media' });
  }
});

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../client')));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para obtener todos los media
app.get('/media', async (req, res) => {
  try {
    const media = await Media.find().select('-__v'); // Excluye el campo __v si no lo necesitas
    console.log('Media enviados:', media); // Añade este log
    res.json(media);
  } catch (error) {
    console.error('Error al obtener media:', error);
    res.status(500).json({ success: false, message: 'Error fetching media' });
  }
});

// Ruta para obtener un media por ID
app.get('/media/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/login.html'));
});

// Ruta para actualizar el estado de registro de un medio
app.put('/media/:id/register', async (req, res) => {
  try {
    const mediaId = req.params.id;
    console.log(`Received request to update register status for media ID: ${mediaId}`);
    const updatedMedia = await Media.findByIdAndUpdate(
      mediaId,
      { registerStatus: 'REGISTER' },
      { new: true }
    );
    if (!updatedMedia) {
      return res.status(404).json({ message: 'Media not found' });
    }
    res.json(updatedMedia);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para enviar un correo con PDF adjunto
app.post('/send-email', async (req, res) => {
  const { email, participationNumber, name, phone, type, instagram, status, day, time, mediaId } = req.body;

  try {
    // Buscar el archivo PDF correspondiente
    const pdfFilename = `ticket_${mediaId}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).send('PDF not found');
    }

    // Leer el archivo PDF
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'r7nyfw@gmail.com',
        pass: 'ugxulskgqiuwehcz'
      }
    });

    const emailTemplate = `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<!-- ...rest of your email template... -->
</html>
`;

    // Enviar correo
    await transporter.sendMail({
      from: 'info@runway7fashion.com',
      to: email,
      subject: 'Your Media Details',
      html: emailTemplate,
      attachments: [{
        filename: 'media-details.pdf',
        content: pdfBuffer
      }]
    });

    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending email');
  }
});


// Función para generar un número de participación único
async function generateParticipationNumber() {
  let number;
  const usedNumbers = await Media.find().distinct('participationNumber');
  do {
    number = 'P' + Math.floor(Math.random() * 1000000);
  } while (usedNumbers.includes(number));
  return number;
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
