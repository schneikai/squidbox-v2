module.exports = function () {
   return {
     autoDetect: true,


     workers: {
       restart: true, // Restart a new process for each subsequent test run
       initial: 1,
       regular: 1,
     },


   };
 };