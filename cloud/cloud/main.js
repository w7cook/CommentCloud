
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:

Parse.Cloud.beforeSave("Topic", function(request, response) {   
  if (!request.object.existed()) {
    // nobody but the server can change a topic
    var commentACL = new Parse.ACL(); 
    commentACL.setPublicReadAccess(true);
    request.object.setACL(commentACL);
    request.object.set("count", 0);
  }
  response.success();   
});

Parse.Cloud.beforeSave("Comment", function(request, response) {   
  if (!request.object.existed()) {
    // only author chan change a comment
    request.object.set("author", Parse.User.current());
    var commentACL = new Parse.ACL(Parse.User.current());
    commentACL.setPublicReadAccess(true);
    request.object.setACL(commentACL);
  }
  response.success();   
});

Parse.Cloud.afterSave("Comment", function(request) {
  Parse.Cloud.useMasterKey(); // update the topic, which is protected

  query = new Parse.Query("Topic");
  query.get(request.object.get("topic").id, {
    success: function(topic) {
      topic.increment("count");
      topic.save();
    },
    error: function(error) {
      throw "Got an error " + error.code + " : " + error.message;
    }
  });
});

Parse.Cloud.define("updateCounts", function(request, response) {
  var query = new Parse.Query("Topic");
  query.get(request.params.topic, {
    success: function(topic) {
      var query2 = new Parse.Query("Comment");
      query2.equalTo("topic", topic);
      query2.find({
        success:function(comments) {
          topic.set("count", comments.length);
          topic.save();
          response.success(comments.length);
        },
        error: function() {
          response.error("No comments found");
        }
      });    
    },
    error: function() {
      response.error("Topic not found");
    }
  });
});