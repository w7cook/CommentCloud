// Copyright 2013 University of Texas at Austin
// William R. Cook

// Initialize Parse with your Parse application javascript keys

// Our basic comment model has `content`, `author` attributes.
var Topic = Parse.Object.extend("Topic");
var Comment = Parse.Object.extend("Comment");
var CommentCounts = {};

function setCommentLabel(link, n) {
  if (n <= 0)
    link.innerHTML = "add comment";
  else if (n == 1)
    link.innerHTML = "1 comment";
  else
    link.innerHTML = n.toString() + " comments";
}

function createCommentFun(link, tag) {
  return function() {
    createTopic(link, tag);
    return false;
  }
}
function showCommentFun(link, tag) {
  return function() {
    showComments(link, tag);
    return false;
  }
}
function CommentSetup(appkey, jskey, pageTag) {
  CommentCurrentPage = pageTag;
  Parse.initialize(appkey, jskey);
  for (i = 0; i < document.links.length; i++) {
    var link = document.links[i];
    if (link.id.substring(0,8) == "Comment:") {
      var tag = link.id.substring(8,100);
      CommentCounts[tag] = -1;
      setCommentLabel(link, -1);
      link.onclick = createCommentFun(link, tag);
    }
  }
  var query = new Parse.Query(Topic);
  query.equalTo("page", pageTag);
  query.find({
    success: function(topics) {
      for (var i = 0; i < topics.length; ++i) {
        var topic = topics[i];
        var tag = topic.get('tag');
        var link = document.getElementById("Comment:" + tag);
        if (link) {
          var n = topic.get("count");
          CommentCounts[tag] = n;
          setCommentLabel(link, n);
          link.onclick = showCommentFun(topic.id, tag);
        }
      }
    }
  });
}

function checkUserNewComment(topicId, tag) {
  var currentUser = Parse.User.current();
  if (currentUser) {
    return createNewCommentBlock(topicId, tag);
  } else {
    return createSigninForm(topicId, tag);
  }
}

function makeCarriageReturnFun(action) {
  return function(event) {
    var chCode = ('charCode' in event) ? event.charCode : event.keyCode;
    if (chCode == 13)
      action();
  }
}

function createUsernameEmailFields(form, action, user) {
  var part = document.createElement("input");
  part.type = "text";
  part.name = "username";
  if (user)
    part.value = user.get("username");
  else
    setupDefaultText(part, "<user name>");
  part.className = "CommentAuthorInput";
  part.onkeypress = makeCarriageReturnFun(action);
  form.appendChild(part);

  form.appendChild(document.createTextNode("Password:"));
  var part = document.createElement("input");
  part.type = "password";
  part.name = "password";
  part.className = "CommentAuthorInput";
  part.onkeypress = makeCarriageReturnFun(action);
  form.appendChild(part);
}

function checkValidData(text) {
  return text != "" && text[0] != "<" && text[text.length - 1] != ">";
}

function createSigninForm(topicId, tag) {
  var form = document.createElement("form");
  form.className = "CommentEntry";

  var needForgot = true;
  var login = function() {
    try {
      var username = form.elements["username"].value;
      var pw = form.elements["password"].value;
      if (!(checkValidData(username) && checkValidData(pw))) {
        alert("Please enter both user name and password");
        return false;
      }
      console.log("TESTING " + username + "/" + pw + " for " + tag);
      Parse.User.logIn(username, pw, {
        success: function(user) {
          var entry = checkUserNewComment(topicId, tag);
          form.parentNode.replaceChild(entry, form);
        },
        error: function(user, error) {
          // Show the error message somewhere and let the user try again.
          alert("Error: " + error.code + " " + error.message);
          if (needForgot) {
            needForgot = false;
            resetPassword = function () {
              var email = form.elements["email"].value;
              if (!checkValidData(email)) {
                alert("Please fill in email");
                return false;
              }
              Parse.User.requestPasswordReset(email, {
                success: function(user) {
                  var entry = checkUserNewComment(topicId, tag);
                  form.parentNode.replaceChild(entry, form);
                },
                error: function(error) {
                  alert("Error: " + error.code + " " + error.message);
                }
              });
              return false;
            }
            
            form.appendChild(document.createElement("br"));
  
            part = document.createElement("input");
            part.type = "text";
            part.name = "email";
            setupDefaultText(part, "<email>");
            part.onkeypress = makeCarriageReturnFun(resetPassword);
            part.className = "CommentAuthorInput";
            form.appendChild(part);
  
            part = document.createElement("input");
            part.type = "button";
            part.value = "Reset Password";
            part.className = "CommentAuthorInput";
            part.onclick = resetPassword;
            form.appendChild(part);
          }
          return false;
        }
      });
    } catch (err) {
      alert(err.message);
    }
    return false;
  };
  createUsernameEmailFields(form, login);

  part = document.createElement("input");
  part.type = "button";
  part.value = "Login";
  part.className = "CommentAuthorInput";
  part.onclick = login;
  form.appendChild(part);

  part = document.createElement("input");
  part.type = "button";
  part.value = "Sign up";
  part.className = "CommentAuthorInput";
  part.onclick = function () {
    var entry = createUserDetailForm(topicId, tag, null, function(user, handler) {
      user.signUp(null, handler);
    });
    form.parentNode.replaceChild(entry, form);
  }
  form.appendChild(part);

  return form;
}

function createUserDetailForm(topicId, tag, user, userAction) {
  var form = document.createElement("form");
  form.className = "CommentEntry";

  signup = function () {
    try {
      var username = form.elements["username"].value;
      var pw = form.elements["password"].value;
      var email = form.elements["email"].value;
      var realname = form.elements["realname"].value;
      console.log("FOO " + user + ": " + (user != null || checkValidData(pw)));
      if (!(checkValidData(username) && (user != null || checkValidData(pw)) && checkValidData(email) && checkValidData(realname))) {
        alert("Please fill in all the fields xx");
        return false;
      }
      if (!user)
        user = new Parse.User();
      user.set("username", username);
      if (pw != "")
        user.set("password", pw);
      user.set("email", email);
      user.set("realname", realname);
      userAction(user, {
        success: function(user) {
          var entry = checkUserNewComment(topicId, tag);
          form.parentNode.replaceChild(entry, form);
        },
        error: function(user, error) {
          // Show the error message somewhere and let the user try again.
          alert("Error: " + error.code + " " + error.message);
        }
      });
    } catch (err) {
      alert(err.message);
    }
    return false;
  }
  createUsernameEmailFields(form, signup, user);

  part = document.createElement("input");
  part.type = "text";
  part.name = "realname";
  if (user)
    part.value = user.get("realname");
  else
    setupDefaultText(part, "<real name>");
  part.onkeypress = makeCarriageReturnFun(signup);
  part.className = "CommentAuthorInput";
  form.appendChild(part);

  part = document.createElement("input");
  part.type = "text";
  part.name = "email";
  if (user)
    part.value = user.get("email");
  else
    setupDefaultText(part, "<email>");
  part.onkeypress = makeCarriageReturnFun(signup);
  part.className = "CommentAuthorInput";
  form.appendChild(part);

  part = document.createElement("input");
  part.type = "button";
  part.value = user ? "Update Account" : "Sign up";
  part.className = "CommentAuthorInput";
  part.onclick = signup;
  form.appendChild(part);

  return form;
}

function setupDefaultText(part, text) {
  part.value = text
  part.onfocus = function () {
    if (part.value == text)
      part.value = "";
    };
  part.onblur = function () {
    if (part.value == "")
      part.value = text;
    };
}

function createEditCommentBlock(topicId, tag, content) {
  var form = document.createElement("form");
  form.className = "CommentEntry";

  var part = document.createElement("textarea");
  part.name = "content";
  part.className = "CommentBodyInput";
  part.rows = 3;
  part.cols = 60;
  if (content)
    part.value = content;
  else
    setupDefaultText(part, "<comment>");
  form.appendChild(part);

  part = document.createElement("input");
  part.type = "Submit";
  part.value = "Submit";
  part.className = "CommentSubmitButton";
  form.appendChild(part);
  
  part = document.createElement("input");
  part.type = "button";
  part.value = "Account";
  part.className = "CommentAuthorInput";
  part.onclick = function () {
    var entry = createUserDetailForm(topicId, tag, Parse.User.current(), function(user, handler) {
      user.save(handler);
    });
    
    part = document.createElement("input");
    part.type = "button";
    part.value = "Sign out";
    part.className = "CommentAuthorInput";
    part.onclick = function () {
      Parse.User.logOut();
      entry.parentNode.replaceChild(checkUserNewComment(topicId, tag), entry);
    }
    entry.appendChild(part);
    form.parentNode.replaceChild(entry, form);
  }
  form.appendChild(part);
  
  return form;
}

// submitting a comment
function createNewCommentBlock(topicId, tag) {
  var form = createEditCommentBlock(topicId, tag);
  form.onsubmit = function () { 
    try {
      var currentUser = Parse.User.current();
      var content = form.elements["content"].value;
      if (!checkValidData(content)) {
        alert("Please enter a comment");
        return false;
      }
      setupDefaultText(form.elements["content"], "<comment>");
      console.log("NEW " + topicId + ":" + content);
      var topic = new Topic();
      topic.id = topicId;
      var comment = new Comment();
      comment.set("author", currentUser);
      comment.set("topic", topic);
      comment.set("content", content);
      comment.save().then(function(comment) {
        var entry = createCommentEntry(comment);
        var holder = document.getElementById("CommentArea:" + tag);
        holder.firstChild.appendChild(entry);
      }, function(error) {
        alert("Error: " + error.code + " " + error.message);
      });
      CommentCounts[tag] = CommentCounts[tag] + 1;
      topic.increment("count");
      topic.save();
    } catch (err) {
      alert(err.message);
    }
    return false;
  }
  return form;
}

function createTopic(link, tag) {
  var topic = new Topic();
  topic.set("tag", tag);
  topic.set("page", CommentCurrentPage);
  topic.save().then(function(topic) {
    link.onclick = showCommentFun(topic.id, tag);
    link.onclick();
  }, function(error) {
    alert("Error: " + error.code + " " + error.message);
  });
}

function showComments(topicId, tag) {
  var link = document.getElementById("Comment:" + tag);
  var holder = document.getElementById("CommentArea:" + tag);
  if (link.innerHTML.substring(0, 4) == "Hide") {
    if (holder)
      holder.style.visibility = "hidden";
    setCommentLabel(link, CommentCounts[tag]);
  } else {
    link.innerHTML = "Hide";
    if (holder) {
      holder.style.visibility = "visible";  
    } else {
      var p = link.parentNode;
      holder = document.createElement("div");
      holder.className = "CommentHolder";
      holder.innerHTML = "Loading...";
      holder.id = "CommentArea:" + tag;
      p.parentNode.insertBefore(holder, p.nextSibling);   

      var topic = new Topic();
      topic.id = topicId;
      var query = new Parse.Query(Comment);
      query.equalTo("topic", topic);
      query.ascending("createdAt");
      query.include('author');
      query.find({
        success: function(comments) {
          holder.innerHTML = "";
          var list = document.createElement("div");
          holder.id = "CommentArea:" + tag;
          holder.appendChild(list);
          for (var j = 0; j < comments.length; ++j) {
            var comment = comments[j];
            var entry = createCommentEntry(comment);
            list.appendChild(entry);
          }
          entry = checkUserNewComment(topicId, tag);
          holder.appendChild(entry);
          if (CommentCounts[tag] != comments.length) {
            CommentCounts[tag] = comments.length;
            topic.set("count", comments.length);
            topic.save();
          }
        }
      });
    }
  }
}      

function createCommentEntry(comment) {
  var author = comment.get('author');

  var block = document.createElement("div");
  block.className = "CommentEntry";
  
  var header = document.createElement("div");
  header.className = "CommentHeader";
  block.appendChild(header);
  
  var part = document.createElement("span");
  part.className = "CommentAuthor";
  part.innerHTML = CommentSanitizeLine(author.get('realname'));
  header.appendChild(part);

  var part = document.createElement("span");
  part.className = "CommentDate";
  part.innerHTML = comment.createdAt;
  header.appendChild(part);
  
  if (author.isCurrent()) {
    var part = document.createElement("a");
    part.className = "CommentEdit";
    part.innerHTML = "edit";
    part.onclick = function () {
      try {
        var topicId = comment.get("topic").id;
        var tag = comment.get("topic").get("tag");
        var edit = createEditCommentBlock(topicId, tag, comment.get('content'));
        block.parentNode.replaceChild(edit, block);
        edit.onsubmit = function () { 
          try {
            comment.set("content", edit.elements["content"].value);
            comment.save().then(function(comment) {
              var entry = createCommentEntry(comment);
              edit.parentNode.replaceChild(entry, edit);
            }, function(error) {
              alert("Error: " + error.code + " " + error.message);
            });
          } catch (err) {
            alert(err.message);
          }
          return false;
        }
      } catch (err) {
        alert(err.message);
      }
      return false;
    }
    
    header.appendChild(part);
  }  
  
  var part = document.createElement("div");
  part.className = "CommentBody";
  part.innerHTML = CommentSanitize(comment.get('content'));
  block.appendChild(part);
  return block;
}

/*
        \[
        (                       // LINK $1
            (?:
                \[[^\]]*\]      // allow brackets nested one level
                |
                [^"\[\]]         // or anything else
            )*
        )
        \]
        \(                      // literal paren
        <?(                     // href = $2
            (?:
                \([^)]*\)       // allow one level of (correctly nested) parens (think MSDN)
                |
                [^()\s]
            )*?
        )>?                
        \)
*/
function CommentSanitizeCode(text) {
  text = text.replace(/</g, "&lt;");
  text = text.replace(/>/g, "&gt;");
  text = text.replace(/\[((?:\[[^\]]*\]|[^"\[\]])*)\]\(<?((?:\([^)]*\)|[^()\s])*?)>?\)/g, '<a href="$2">$1</a>');
  return text;
}

function CommentSanitizeLine(text) {
  text = CommentSanitizeCode(text);
  text = text.replace(/\*\*([^*][^*]*)\*\*/g, "<b>$1</b>");
  text = text.replace(/\*([^*][^*]*)\*/g, "<i>$1</i>");
  text = text.replace(/\|([^|][^|]*)\|/g, "<tt>$1</tt>");
  return text;
}

function CommentSanitize(text) {
  text = text.split("\n");
  var result = "";
  var code = false;
  for (i in text) {
    if (text[i].substring(0, 2) == "  ") {
      line = CommentSanitizeCode(text[i]);
      if (!code)
        result = result + "<pre>";
      code = true;
      result = result + line.substring(2) + "\n";
    } else {
      line = CommentSanitizeLine(text[i]);
      if (code)
        result = result + "</pre>";
      code = false;
      result = result + line + "<br>";
    }
  }
  return result;
}  
