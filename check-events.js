const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/unity', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  const Event = mongoose.model('Event', {
    eventTitle: String,
    eventStatus: String,
    eventDate: Date,
    memberId: mongoose.Schema.Types.ObjectId,
  });

  const events = await Event.find().limit(5).lean();
  console.log('=== Events in Database ===');
  events.forEach((e, i) => {
    console.log(`${i+1}. ${e.eventTitle || 'N/A'} | Status: ${e.eventStatus}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
